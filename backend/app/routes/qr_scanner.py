import datetime
import fitz
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from ..models import Batch, ScannedFile, ScannedPage, Candidate, CandidatePage, ProcessingJob, AuditLog
from ..qr_engine import qr_engine
from ..schemas import ScannedPageResponse, CandidateResponse

router = APIRouter(prefix="/qr", tags=["QR Scanner"])

def execute_batch_qr_pipeline(batch_id: int, db: Session):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    job = db.query(ProcessingJob).filter(
        ProcessingJob.batch_id == batch_id,
        ProcessingJob.job_type == "qr_scan"
    ).first()

    if not job:
        job = ProcessingJob(
            batch_id=batch_id,
            job_type="qr_scan",
            status="running",
            progress=0.0,
            current_step="Extracting pages and scanning QR codes"
        )
        db.add(job)
        db.commit()
    else:
        job.status = "running"
        job.progress = 0.0
        job.error_message = None
        db.commit()

    try:
        # Clear previous pages and candidates if re-running
        db.query(Candidate).filter(Candidate.batch_id == batch_id).delete()
        db.query(ScannedPage).filter(ScannedPage.batch_id == batch_id).delete()
        db.commit()

        scanned_files = db.query(ScannedFile).filter(ScannedFile.batch_id == batch_id).all()
        global_page_counter = 1
        total_pages = sum(f.page_count for f in scanned_files)
        
        seen_register_numbers: Dict[str, int] = {} # reg -> candidate_id
        created_candidates = []
        duplicate_count = 0
        failed_qr_count = 0

        for sfile in scanned_files:
            doc = fitz.open(sfile.file_path)
            for page_idx in range(len(doc)):
                pdf_page = doc[page_idx]

                # Run QR Code Detection & Decoding Pipeline
                qr_res = qr_engine.process_pdf_page(
                    pdf_page=pdf_page,
                    page_idx=page_idx,
                    save_img_dir=settings.PAGES_PATH,
                    batch_id=batch_id
                )

                reg_num = qr_res["register_number"]
                qr_status = qr_res["qr_status"]
                cand_name = qr_res["candidate_name"]

                has_conflict = False
                verification_status = "verified"
                notes = None

                if qr_status == "success" and reg_num:
                    # Check for duplicate Register Numbers
                    if reg_num in seen_register_numbers:
                        has_conflict = True
                        verification_status = "conflict"
                        duplicate_count += 1
                        notes = f"DUPLICATE WARNING: Register Number {reg_num} was also detected on Page #{seen_register_numbers[reg_num]}."
                        
                        # Also flag the earlier candidate
                        earlier_cand = db.query(Candidate).filter(Candidate.id == seen_register_numbers[reg_num]).first()
                        if earlier_cand:
                            earlier_cand.has_conflict = True
                            earlier_cand.verification_status = "conflict"
                            earlier_cand.notes = f"DUPLICATE CONFLICT: Register Number {reg_num} also appears on Page #{global_page_counter}."
                    else:
                        verification_status = "verified"
                else:
                    # QR Code could not be detected or payload unparsed
                    failed_qr_count += 1
                    reg_num = f"UNKNOWN_P{global_page_counter:03d}"
                    verification_status = "review_required"
                    notes = "QR code not detected or unreadable. Manual register number required."

                # 1. Create ScannedPage
                scanned_page = ScannedPage(
                    batch_id=batch_id,
                    source_file_id=sfile.id,
                    original_page_number=page_idx + 1,
                    global_page_number=global_page_counter,
                    page_image_path=qr_res["page_image_path"],
                    qr_status=qr_status,
                    raw_qr_payload=qr_res["raw_payload"],
                    decoder_info=qr_res["decoder_info"],
                    recognized_roll_number=reg_num,
                    recognized_name=cand_name,
                    confidence_score=100.0 if qr_status == "success" else 0.0,
                    verification_status=verification_status,
                    is_blank=False,
                    skew_angle=0.0
                )
                db.add(scanned_page)
                db.flush()

                # 2. RULE: ONE SCANNED PAGE = ONE CANDIDATE = ONE PDF
                candidate = Candidate(
                    batch_id=batch_id,
                    roll_number=reg_num,
                    candidate_name=cand_name,
                    page_count=1,
                    verification_status=verification_status,
                    has_conflict=has_conflict,
                    qr_status=qr_status,
                    notes=notes
                )
                db.add(candidate)
                db.flush()

                # Track register number to page id for duplicate linking
                if qr_status == "success" and reg_num and not has_conflict:
                    seen_register_numbers[reg_num] = candidate.id

                # 3. Link page to candidate (page_order = 1)
                cand_page = CandidatePage(
                    candidate_id=candidate.id,
                    scanned_page_id=scanned_page.id,
                    page_order=1
                )
                db.add(cand_page)
                created_candidates.append(candidate)

                global_page_counter += 1

                # Progress update
                if total_pages > 0:
                    job.progress = round((len(created_candidates) / total_pages) * 100, 1)
                    job.current_step = f"Scanned QR on page {len(created_candidates)} of {total_pages}"
                    db.commit()

            doc.close()

        batch.total_pages = len(created_candidates)
        batch.total_candidates = len(created_candidates)
        batch.status = "ready_for_export" if duplicate_count == 0 and failed_qr_count == 0 else "ready_for_review"

        job.status = "completed"
        job.progress = 100.0
        job.completed_at = datetime.datetime.utcnow()
        job.current_step = f"QR scanning completed: {len(created_candidates)} pages processed ({duplicate_count} duplicates, {failed_qr_count} review required)."

        audit = AuditLog(
            batch_id=batch_id,
            action="qr_scan_complete",
            details=f"QR scanned {len(created_candidates)} pages. Decoded: {len(created_candidates) - failed_qr_count}, Failed: {failed_qr_count}, Duplicates: {duplicate_count}."
        )
        db.add(audit)
        db.commit()

        return {
            "batch_id": batch_id,
            "total_pages": len(created_candidates),
            "total_candidates": len(created_candidates),
            "decoded_qr_count": len(created_candidates) - failed_qr_count,
            "failed_qr_count": failed_qr_count,
            "duplicate_count": duplicate_count
        }

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/{batch_id}")
def process_batch_qr(batch_id: int, db: Session = Depends(get_db)):
    """Triggers the QR code detection and Register Number extraction pipeline."""
    return execute_batch_qr_pipeline(batch_id, db)

@router.post("/retry-page/{page_id}")
def retry_page_qr(page_id: int, db: Session = Depends(get_db)):
    """Retries high-resolution QR detection on a single failed page."""
    page = db.query(ScannedPage).filter(ScannedPage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    sfile = page.file
    doc = fitz.open(sfile.file_path)
    pdf_page = doc[page.original_page_number - 1]

    # Process with 300 DPI high-res mode
    qr_res = qr_engine.process_pdf_page(
        pdf_page=pdf_page,
        page_idx=page.original_page_number - 1,
        save_img_dir=settings.PAGES_PATH,
        batch_id=page.batch_id
    )
    doc.close()

    if qr_res["qr_status"] == "success" and qr_res["register_number"]:
        page.qr_status = "success"
        page.raw_qr_payload = qr_res["raw_payload"]
        page.decoder_info = qr_res["decoder_info"]
        page.recognized_roll_number = qr_res["register_number"]
        page.recognized_name = qr_res["candidate_name"]
        page.verification_status = "verified"

        # Update candidate
        cand_link = page.candidate_links[0] if page.candidate_links else None
        if cand_link:
            cand = cand_link.candidate
            cand.roll_number = qr_res["register_number"]
            cand.candidate_name = qr_res["candidate_name"]
            cand.verification_status = "verified"
            cand.qr_status = "success"
            cand.notes = None

        db.commit()
        return {"status": "success", "register_number": qr_res["register_number"]}
    else:
        return {"status": "failed", "message": "QR code still not detected after multi-tier preprocessing retry."}
