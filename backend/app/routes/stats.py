from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from ..models import Batch, ScannedPage, Candidate, AuditLog, ScannedFile
from ..schemas import AuditLogResponse

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_batches = db.query(Batch).count()
    total_files = db.query(ScannedFile).count()
    total_pages = db.query(ScannedPage).count()
    total_candidates = db.query(Candidate).count()
    
    verified_candidates = db.query(Candidate).filter(Candidate.verification_status == "verified").count()
    review_candidates = db.query(Candidate).filter(Candidate.verification_status == "review_required").count()
    conflict_candidates = db.query(Candidate).filter(Candidate.has_conflict == True).count()
    pdfs_generated = db.query(Candidate).filter(Candidate.pdf_path != None).count()
    decoded_qr_codes = db.query(ScannedPage).filter(ScannedPage.qr_status == "success").count()
    failed_qr_detections = db.query(ScannedPage).filter(ScannedPage.qr_status != "success").count()

    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(15).all()

    return {
        "total_batches": total_batches,
        "total_files": total_files,
        "total_pages": total_pages,
        "total_candidates": total_candidates,
        "decoded_qr_codes": decoded_qr_codes,
        "failed_qr_detections": failed_qr_detections,
        "verified_candidates": verified_candidates,
        "review_candidates": review_candidates,
        "conflict_candidates": conflict_candidates,
        "pdfs_generated": pdfs_generated,
        "recent_audit_logs": [
            {
                "id": log.id,
                "batch_id": log.batch_id,
                "candidate_id": log.candidate_id,
                "action": log.action,
                "details": log.details,
                "operator": log.operator,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            }
            for log in recent_logs
        ]
    }

@router.get("/audit-logs/{batch_id}", response_model=List[AuditLogResponse])
def get_batch_audit_logs(batch_id: int, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).filter(
        AuditLog.batch_id == batch_id
    ).order_by(AuditLog.timestamp.desc()).all()
    return logs
