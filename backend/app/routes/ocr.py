from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Batch, ScannedPage
from ..schemas import ScannedPageResponse
from .qr_scanner import execute_batch_qr_pipeline

router = APIRouter(prefix="/ocr", tags=["OCR / QR Compatibility"])

@router.post("/process/{batch_id}")
def process_batch(batch_id: int, db: Session = Depends(get_db)):
    """
    Backward compatibility endpoint: routes directly to QR Code detection pipeline.
    OCR is replaced with QR Code scanning.
    """
    return execute_batch_qr_pipeline(batch_id, db)

@router.get("/pages/{batch_id}", response_model=List[ScannedPageResponse])
def get_batch_pages(batch_id: int, db: Session = Depends(get_db)):
    pages = db.query(ScannedPage).filter(
        ScannedPage.batch_id == batch_id
    ).order_by(ScannedPage.global_page_number.asc()).all()
    return pages
