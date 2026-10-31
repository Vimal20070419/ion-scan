from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Candidate, CandidatePage, ScannedPage, AuditLog, Batch
from ..schemas import CandidateResponse, CandidateUpdate

router = APIRouter(prefix="/candidates", tags=["Candidates"])

@router.get("/batch/{batch_id}", response_model=List[CandidateResponse])
def get_batch_candidates(batch_id: int, db: Session = Depends(get_db)):
    candidates = db.query(Candidate).filter(
        Candidate.batch_id == batch_id
    ).order_by(Candidate.id.asc()).all()
    return candidates

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand

@router.patch("/{candidate_id}", response_model=CandidateResponse)
def update_candidate_register_number(
    candidate_id: int,
    payload: CandidateUpdate,
    db: Session = Depends(get_db)
):
    """
    Allows the operator to manually enter/edit the Register Number
    (e.g., for pages with damaged QR codes or to resolve duplicate number conflicts).
    """
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_roll = cand.roll_number
    if payload.roll_number is not None and payload.roll_number.strip():
        new_reg = payload.roll_number.strip()
        
        # Check if new register number conflicts with another candidate in the same batch
        existing = db.query(Candidate).filter(
            Candidate.batch_id == cand.batch_id,
            Candidate.roll_number == new_reg,
            Candidate.id != cand.id
        ).first()

        if existing:
            cand.has_conflict = True
            cand.verification_status = "conflict"
            cand.notes = f"Warning: Register number {new_reg} is duplicate with Candidate #{existing.id}"
            existing.has_conflict = True
            existing.verification_status = "conflict"
        else:
            cand.has_conflict = False
            cand.verification_status = "verified"
            cand.notes = None

            # Also check if the old roll conflict on other candidates is now resolved!
            old_conflict_siblings = db.query(Candidate).filter(
                Candidate.batch_id == cand.batch_id,
                Candidate.roll_number == old_roll,
                Candidate.id != cand.id
            ).all()
            if len(old_conflict_siblings) == 1:
                old_conflict_siblings[0].has_conflict = False
                old_conflict_siblings[0].verification_status = "verified"
                old_conflict_siblings[0].notes = None

        cand.roll_number = new_reg

        # Also update linked ScannedPage record
        if cand.pages:
            cand.pages[0].scanned_page.recognized_roll_number = new_reg
            cand.pages[0].scanned_page.verification_status = cand.verification_status

    if payload.candidate_name is not None:
        cand.candidate_name = payload.candidate_name.strip()
        if cand.pages:
            cand.pages[0].scanned_page.recognized_name = cand.candidate_name

    if payload.verification_status is not None:
        cand.verification_status = payload.verification_status

    audit = AuditLog(
        batch_id=cand.batch_id,
        candidate_id=cand.id,
        action="edit_register_number",
        details=f"Updated candidate register number: {cand.roll_number} (was {old_roll}), status={cand.verification_status}"
    )
    db.add(audit)
    db.commit()
    db.refresh(cand)
    return cand

@router.delete("/{candidate_id}")
def delete_candidate_record(candidate_id: int, db: Session = Depends(get_db)):
    """Removes an incorrect or unwanted record from the batch."""
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    batch_id = cand.batch_id
    roll = cand.roll_number
    db.delete(cand)
    
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if batch:
        batch.total_candidates = len(batch.candidates)

    audit = AuditLog(
        batch_id=batch_id,
        action="delete_candidate",
        details=f"Deleted candidate record with register number {roll}."
    )
    db.add(audit)
    db.commit()

    return {"message": "Candidate record deleted successfully"}
