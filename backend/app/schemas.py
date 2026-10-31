from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: str = "operator"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ScannedPageResponse(BaseModel):
    id: int
    batch_id: int
    source_file_id: int
    original_page_number: int
    global_page_number: int
    page_image_path: Optional[str] = None
    qr_status: str = "pending"
    raw_qr_payload: Optional[str] = None
    decoder_info: Optional[str] = None
    recognized_roll_number: Optional[str] = None
    recognized_name: Optional[str] = None
    confidence_score: float = 100.0
    verification_status: str = "verified"
    is_blank: bool = False
    skew_angle: float = 0.0

    model_config = ConfigDict(from_attributes=True)

class CandidatePageItem(BaseModel):
    id: int
    page_order: int
    scanned_page: ScannedPageResponse

    model_config = ConfigDict(from_attributes=True)

class CandidateResponse(BaseModel):
    id: int
    batch_id: int
    roll_number: str # Register Number
    candidate_name: str
    page_count: int = 1
    pdf_path: Optional[str] = None
    verification_status: str # verified, review_required, conflict
    has_conflict: bool = False
    qr_status: str = "success"
    notes: Optional[str] = None
    pages: List[CandidatePageItem] = []

    model_config = ConfigDict(from_attributes=True)

class BatchSummary(BaseModel):
    id: int
    batch_name: str
    examination_name: str
    examination_date: str
    total_pages: int
    total_candidates: int
    status: str
    created_at: datetime
    verified_candidates: int = 0
    review_candidates: int = 0
    conflict_candidates: int = 0
    zip_ready: bool = False
    zip_size_mb: Optional[float] = None
    zip_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CandidateUpdate(BaseModel):
    roll_number: Optional[str] = None # New Register Number
    candidate_name: Optional[str] = None
    verification_status: Optional[str] = None
    notes: Optional[str] = None

class ScannerConfig(BaseModel):
    scanner_name: str = "ADF High-Speed Document Scanner (fi-7160)"
    paper_size: str = "A4"
    resolution_dpi: int = 300
    color_mode: str = "color"
    duplex: bool = False # Single-sheet hall tickets
    auto_rotate: bool = True
    blank_detection: bool = True
    deskew: bool = True

class ProcessingJobResponse(BaseModel):
    id: int
    batch_id: int
    job_type: str
    status: str
    progress: float
    current_step: str
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AuditLogResponse(BaseModel):
    id: int
    batch_id: int
    candidate_id: Optional[int] = None
    action: str
    details: Optional[str] = None
    operator: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
