from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Batch, ScannedPage, Candidate, AuditLog
from ..schemas import BatchSummary

router = APIRouter(prefix="/batches", tags=["Batches"])

@router.get("", response_model=List[BatchSummary])
def list_batches(db: Session = Depends(get_db)):
    batches = db.query(Batch).order_by(Batch.created_at.desc()).all()
    results = []
    for b in batches:
        verified = sum(1 for c in b.candidates if c.verification_status == "verified")
        review = sum(1 for c in b.candidates if c.verification_status == "review_required")
        conflict = sum(1 for c in b.candidates if c.has_conflict or c.verification_status == "conflict")
        
        # Check if zip exists
        from ..config import settings
        import glob, os
        zip_files = glob.glob(str(settings.ZIP_PATH / f"HallTickets_{b.batch_name}*.zip"))
        zip_ready = len(zip_files) > 0
        zip_size = None
        zip_path = None
        if zip_ready:
            zip_path = zip_files[-1]
            zip_size = round(os.path.getsize(zip_path) / (1024 * 1024), 2)
            zip_path = f"/api/export/batch/{b.id}/download-zip"

        results.append(BatchSummary(
            id=b.id,
            batch_name=b.batch_name,
            examination_name=b.examination_name,
            examination_date=b.examination_date,
            total_pages=b.total_pages,
            total_candidates=b.total_candidates,
            status=b.status,
            created_at=b.created_at,
            verified_candidates=verified,
            review_candidates=review,
            conflict_candidates=conflict,
            zip_ready=zip_ready,
            zip_size_mb=zip_size,
            zip_path=zip_path
        ))
    return results

@router.get("/{batch_id}", response_model=BatchSummary)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    b = db.query(Batch).filter(Batch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")

    verified = sum(1 for c in b.candidates if c.verification_status == "verified")
    review = sum(1 for c in b.candidates if c.verification_status == "review_required")
    conflict = sum(1 for c in b.candidates if c.has_conflict or c.verification_status == "conflict")

    import glob, os
    from ..config import settings
    zip_files = glob.glob(str(settings.ZIP_PATH / f"HallTickets_{b.batch_name}*.zip"))
    zip_ready = len(zip_files) > 0
    zip_size = None
    zip_path = None
    if zip_ready:
        zip_p = zip_files[-1]
        zip_size = round(os.path.getsize(zip_p) / (1024 * 1024), 2)
        zip_path = f"/api/export/batch/{b.id}/download-zip"

    return BatchSummary(
        id=b.id,
        batch_name=b.batch_name,
        examination_name=b.examination_name,
        examination_date=b.examination_date,
        total_pages=b.total_pages,
        total_candidates=b.total_candidates,
        status=b.status,
        created_at=b.created_at,
        verified_candidates=verified,
        review_candidates=review,
        conflict_candidates=conflict,
        zip_ready=zip_ready,
        zip_size_mb=zip_size,
        zip_path=zip_path
    )

@router.delete("/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    b = db.query(Batch).filter(Batch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(b)
    db.commit()
    return {"message": f"Batch {batch_id} deleted successfully"}
