from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import fitz
from ..database import get_db
from ..config import settings
from ..scanner_bridge import scanner_bridge
from ..models import Batch, ScannedFile, AuditLog
from ..schemas import ScannerConfig

router = APIRouter(prefix="/scanner", tags=["Scanner"])

@router.get("/devices")
def get_connected_scanners():
    return scanner_bridge.get_scanner_list()

@router.post("/scan")
def trigger_scan(
    config: ScannerConfig,
    batch_name: str = "ADF_Scan_Stack",
    examination_name: str = "National Entrance Examination 2026",
    db: Session = Depends(get_db)
):
    # Perform scan acquisition via bridge
    scan_result = scanner_bridge.perform_scan(
        scanner_id=config.scanner_name,
        config=config.model_dump(),
        output_dir=settings.UPLOAD_PATH
    )

    if scan_result.get("status") != "success":
        raise HTTPException(status_code=500, detail="Scanner acquisition failed")

    # Read page count
    file_path = scan_result["file_path"]
    filename = scan_result["filename"]
    doc = fitz.open(file_path)
    page_count = len(doc)
    doc.close()

    # Create batch
    batch = Batch(
        batch_name=f"{batch_name}_{scan_result['timestamp']}",
        examination_name=examination_name,
        total_pages=page_count,
        status="uploaded"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Create ScannedFile
    scanned_file = ScannedFile(
        batch_id=batch.id,
        original_filename=filename,
        file_path=file_path,
        page_count=page_count
    )
    db.add(scanned_file)

    # Audit log
    audit = AuditLog(
        batch_id=batch.id,
        action="scanner_feed",
        details=f"ADF Scanner '{config.scanner_name}' fed and scanned {page_count} pages at {config.resolution_dpi} DPI ({config.color_mode})."
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "batch_id": batch.id,
        "batch_name": batch.batch_name,
        "filename": filename,
        "pages_scanned": page_count,
        "message": f"Successfully fed and scanned {page_count} pages from ADF scanner."
    }
