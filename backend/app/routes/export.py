import os
import glob
import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from ..models import Batch, Candidate, CandidatePage, ScannedPage, ScannedFile, AuditLog
from ..pdf_engine import pdf_engine

router = APIRouter(prefix="/export", tags=["Export"])

@router.post("/batch/{batch_id}/generate-pdfs")
def generate_candidate_pdfs(
    batch_id: int,
    include_review: bool = True,
    db: Session = Depends(get_db)
):
    """
    Generates one individual PDF per scanned page, named {register_number}.pdf.
    Halts if unresolved duplicate register number conflicts exist.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Critical check: Stop automatic finalization if duplicate register numbers exist!
    conflicts = db.query(Candidate).filter(
        Candidate.batch_id == batch_id,
        Candidate.has_conflict == True
    ).all()

    if conflicts:
        conflict_regs = list(set([c.roll_number for c in conflicts]))
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate PDFs: Duplicate register numbers detected ({', '.join(conflict_regs)}). Please resolve duplicate conflicts in the dashboard before exporting."
        )

    candidates = db.query(Candidate).filter(Candidate.batch_id == batch_id).all()
    if not candidates:
        raise HTTPException(status_code=400, detail="No candidates found in batch")

    batch_out_dir = settings.OUTPUT_PATH / f"batch_{batch_id}"
    batch_out_dir.mkdir(parents=True, exist_ok=True)

    generated_count = 0
    generated_list = []

    for cand in candidates:
        if cand.verification_status != "verified" and not include_review:
            continue

        cand_pages = cand.pages
        page_sources = []
        for cp in cand_pages:
            sp = cp.scanned_page
            sfile = sp.file
            page_sources.append({
                "source_file_path": sfile.file_path,
                "original_page_number": sp.original_page_number
            })

        if page_sources:
            # Generate individual 1-page PDF named {register_number}.pdf
            pdf_path = pdf_engine.generate_candidate_pdf(
                roll_number=cand.roll_number,
                source_pages=page_sources,
                output_dir=batch_out_dir
            )
            cand.pdf_path = pdf_path
            generated_count += 1
            generated_list.append({
                "candidate_id": cand.id,
                "register_number": cand.roll_number,
                "pages": len(page_sources),
                "pdf_filename": os.path.basename(pdf_path)
            })

    batch.status = "finalized"
    
    audit = AuditLog(
        batch_id=batch_id,
        action="generate_pdfs",
        details=f"Generated {generated_count} individual PDFs named by Register Number."
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "batch_id": batch_id,
        "total_pdfs_generated": generated_count,
        "candidates": generated_list
    }

@router.post("/batch/{batch_id}/generate-zip")
def create_zip_archive(batch_id: int, db: Session = Depends(get_db)):
    """
    Packages all individual candidate PDFs into a single ZIP archive: HallTickets.zip
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    candidates = db.query(Candidate).filter(
        Candidate.batch_id == batch_id,
        Candidate.pdf_path != None
    ).all()

    if not candidates:
        # Generate PDFs first if not yet done
        generate_candidate_pdfs(batch_id=batch_id, db=db)
        candidates = db.query(Candidate).filter(
            Candidate.batch_id == batch_id,
            Candidate.pdf_path != None
        ).all()

    pdf_records = [(c.roll_number, c.pdf_path) for c in candidates if c.pdf_path and os.path.exists(c.pdf_path)]

    if not pdf_records:
        raise HTTPException(status_code=400, detail="No generated candidate PDFs available to package into ZIP")

    zip_path, size_mb, count = pdf_engine.create_batch_zip(
        batch_name="HallTickets",
        candidate_pdf_paths=pdf_records,
        zip_dir=settings.ZIP_PATH
    )

    batch.status = "completed"

    audit = AuditLog(
        batch_id=batch_id,
        action="create_zip",
        details=f"Created ZIP archive {os.path.basename(zip_path)} with {count} individual candidate PDFs ({size_mb} MB)."
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "batch_id": batch_id,
        "zip_filename": os.path.basename(zip_path),
        "file_count": count,
        "size_mb": size_mb,
        "download_url": f"/api/export/batch/{batch_id}/download-zip"
    }

@router.get("/batch/{batch_id}/download-zip")
def download_zip(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    zip_pattern = str(settings.ZIP_PATH / f"HallTickets_*.zip")
    zip_files = glob.glob(zip_pattern)

    if not zip_files:
        create_zip_archive(batch_id, db)
        zip_files = glob.glob(zip_pattern)

    if not zip_files:
        raise HTTPException(status_code=404, detail="ZIP archive not found")

    latest_zip = sorted(zip_files, key=os.path.getmtime)[-1]
    return FileResponse(
        latest_zip,
        media_type="application/zip",
        filename="HallTickets.zip"
    )

@router.get("/batch/{batch_id}/export-csv")
def export_register_numbers_csv(batch_id: int, db: Session = Depends(get_db)):
    """Exports Register Numbers and QR scanning results as a CSV file."""
    candidates = db.query(Candidate).filter(Candidate.batch_id == batch_id).all()
    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Page_Number", "Register_Number", "Candidate_Name", "QR_Status", "Verification_Status", "PDF_Generated", "Filename"])

    for cand in candidates:
        page_num = cand.pages[0].scanned_page.original_page_number if cand.pages else 1
        pdf_gen = "Yes" if cand.pdf_path else "No"
        filename = f"{cand.roll_number}.pdf"
        writer.writerow([page_num, cand.roll_number, cand.candidate_name, cand.qr_status, cand.verification_status, pdf_gen, filename])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=HallTicket_Register_Numbers_{batch_id}.csv"}
    )

@router.get("/candidate/{candidate_id}/download")
def download_candidate_pdf(candidate_id: int, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if not cand.pdf_path or not os.path.exists(cand.pdf_path):
        cand_pages = cand.pages
        page_sources = []
        for cp in cand_pages:
            sp = cp.scanned_page
            page_sources.append({
                "source_file_path": sp.file.file_path,
                "original_page_number": sp.original_page_number
            })
        batch_out_dir = settings.OUTPUT_PATH / f"batch_{cand.batch_id}"
        batch_out_dir.mkdir(parents=True, exist_ok=True)
        pdf_path = pdf_engine.generate_candidate_pdf(cand.roll_number, page_sources, batch_out_dir)
        cand.pdf_path = pdf_path
        db.commit()

    return FileResponse(
        cand.pdf_path,
        media_type="application/pdf",
        filename=f"{cand.roll_number}.pdf"
    )
