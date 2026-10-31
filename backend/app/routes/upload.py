import os
import shutil
import fitz
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from ..models import Batch, ScannedFile, AuditLog

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("")
async def upload_documents(
    files: List[UploadFile] = File(...),
    batch_name: Optional[str] = Form(None),
    examination_name: Optional[str] = Form("National Entrance Examination 2026"),
    examination_date: Optional[str] = Form("15-Nov-2026"),
    batch_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # If appending to existing batch or creating new
    if batch_id:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
    else:
        name = batch_name or f"ADF_Batch_{len(db.query(Batch).all()) + 1}"
        batch = Batch(
            batch_name=name,
            examination_name=examination_name,
            examination_date=examination_date,
            status="uploaded"
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)

    uploaded_files_info = []
    total_new_pages = 0

    for file in files:
        filename = file.filename
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"]:
            continue

        save_path = settings.UPLOAD_PATH / f"batch_{batch.id}_{filename}"
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Count pages
        page_count = 1
        if ext == ".pdf":
            try:
                doc = fitz.open(str(save_path))
                page_count = len(doc)
                doc.close()
            except Exception:
                page_count = 1

        scanned_file = ScannedFile(
            batch_id=batch.id,
            original_filename=filename,
            file_path=str(save_path),
            page_count=page_count
        )
        db.add(scanned_file)
        db.flush()

        total_new_pages += page_count
        uploaded_files_info.append({
            "id": scanned_file.id,
            "filename": filename,
            "page_count": page_count,
            "file_path": str(save_path)
        })

    batch.total_pages += total_new_pages
    
    # Audit log
    audit = AuditLog(
        batch_id=batch.id,
        action="bulk_upload",
        details=f"Uploaded {len(uploaded_files_info)} files with {total_new_pages} total pages."
    )
    db.add(audit)
    db.commit()

    return {
        "batch_id": batch.id,
        "batch_name": batch.batch_name,
        "total_pages": batch.total_pages,
        "files": uploaded_files_info
    }
