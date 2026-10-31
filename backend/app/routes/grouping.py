import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Batch, ScannedPage, Candidate, CandidatePage, AuditLog, ProcessingJob
from ..grouping_engine import grouping_engine
from ..schemas import CandidateResponse

router = APIRouter(prefix="/grouping", tags=["Grouping"])

@router.post("/process/{batch_id}")
def execute_candidate_grouping(
    batch_id: int,
    mode: str = "sequential",  # sequential (Mode A) or mixed (Mode B)
    skip_blanks: bool = True,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Fetch pages
    scanned_pages = db.query(ScannedPage).filter(
        ScannedPage.batch_id == batch_id
    ).order_by(ScannedPage.global_page_number.asc()).all()

    if not scanned_pages:
        raise HTTPException(status_code=400, detail="No scanned pages found. Run OCR first.")

    # Convert to dictionaries for grouping engine
    pages_data = []
    page_id_map = {}
    for p in scanned_pages:
        p_dict = {
            "id": p.id,
            "original_page_number": p.original_page_number,
            "global_page_number": p.global_page_number,
            "recognized_roll_number": p.recognized_roll_number,
            "recognized_name": p.recognized_name,
            "recognized_page_info": p.recognized_page_info,
            "detected_current_page": p.detected_current_page,
            "detected_total_pages": p.detected_total_pages,
            "is_first_page_indicator": p.is_first_page_indicator,
            "confidence_score": p.confidence_score,
            "verification_status": p.verification_status,
            "is_blank": p.is_blank,
            "skew_angle": p.skew_angle
        }
        pages_data.append(p_dict)
        page_id_map[p.id] = p

    # Execute grouping
    grouped_results = grouping_engine.group_pages_sequential(pages_data, skip_blanks=skip_blanks)

    # Clear previous candidates if re-grouping
    db.query(Candidate).filter(Candidate.batch_id == batch_id).delete()
    db.commit()

    created_candidates = []
    total_assigned_pages = 0

    for grp in grouped_results:
        cand = Candidate(
            batch_id=batch_id,
            roll_number=grp["roll_number"],
            candidate_name=grp["candidate_name"],
            page_count=grp["page_count"],
            verification_status=grp["verification_status"],
            has_conflict=grp["has_conflict"],
            notes=grp["notes"]
        )
        db.add(cand)
        db.flush()

        for idx, p_item in enumerate(grp["pages"]):
            cand_page = CandidatePage(
                candidate_id=cand.id,
                scanned_page_id=p_item["id"],
                page_order=idx + 1
            )
            db.add(cand_page)
            total_assigned_pages += 1

        created_candidates.append(cand)

    batch.total_candidates = len(created_candidates)
    batch.status = "ready_for_review"

    audit = AuditLog(
        batch_id=batch_id,
        action="grouping_executed",
        details=f"Intelligent grouping grouped {total_assigned_pages} pages into {len(created_candidates)} candidate groups."
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "batch_id": batch_id,
        "total_candidates": len(created_candidates),
        "total_pages_assigned": total_assigned_pages,
        "message": f"Successfully grouped {total_assigned_pages} pages into {len(created_candidates)} candidates."
    }
