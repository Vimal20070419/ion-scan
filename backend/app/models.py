import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="operator")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String(200), nullable=False, index=True)
    examination_name = Column(String(200), default="National Entrance Examination 2026")
    examination_date = Column(String(50), default="15-Nov-2026")
    total_pages = Column(Integer, default=0)
    total_candidates = Column(Integer, default=0)
    status = Column(String(50), default="uploaded")  # uploaded, qr_scanned, ready_for_export, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    files = relationship("ScannedFile", back_populates="batch", cascade="all, delete-orphan")
    pages = relationship("ScannedPage", back_populates="batch", cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="batch", cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="batch", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="batch", cascade="all, delete-orphan")

class ScannedFile(Base):
    __tablename__ = "scanned_files"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    page_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    batch = relationship("Batch", back_populates="files")
    pages = relationship("ScannedPage", back_populates="file", cascade="all, delete-orphan")

class ScannedPage(Base):
    __tablename__ = "scanned_pages"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    source_file_id = Column(Integer, ForeignKey("scanned_files.id", ondelete="CASCADE"), nullable=False)
    original_page_number = Column(Integer, nullable=False)  # 1-indexed in source file
    global_page_number = Column(Integer, default=1)        # 1-indexed in batch
    page_image_path = Column(String(500), nullable=True)   # High-res preview image
    
    # QR Code Recognition Fields (Replaced OCR)
    qr_status = Column(String(50), default="pending")      # success, qr_not_detected, payload_unparsed, conflict
    raw_qr_payload = Column(Text, nullable=True)           # Full raw decoded QR data
    decoder_info = Column(String(100), nullable=True)      # pyzbar, opencv, +clahe, +rot90, etc.
    recognized_roll_number = Column(String(100), nullable=True, index=True) # Register Number
    recognized_name = Column(String(200), nullable=True)
    confidence_score = Column(Float, default=100.0)
    verification_status = Column(String(50), default="verified")  # verified, review_required, conflict
    is_blank = Column(Boolean, default=False)
    skew_angle = Column(Float, default=0.0)

    # Relationships
    batch = relationship("Batch", back_populates="pages")
    file = relationship("ScannedFile", back_populates="pages")
    candidate_links = relationship("CandidatePage", back_populates="scanned_page", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    roll_number = Column(String(100), nullable=False, index=True) # Register Number
    candidate_name = Column(String(200), default="Candidate")
    page_count = Column(Integer, default=1)                      # Exactly 1 page per candidate
    pdf_path = Column(String(500), nullable=True)
    verification_status = Column(String(50), default="verified")  # verified, review_required, conflict
    has_conflict = Column(Boolean, default=False)
    qr_status = Column(String(50), default="success")            # success, qr_not_detected, conflict
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="candidates")
    pages = relationship("CandidatePage", back_populates="candidate", cascade="all, delete-orphan", order_by="CandidatePage.page_order")

class CandidatePage(Base):
    __tablename__ = "candidate_pages"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    scanned_page_id = Column(Integer, ForeignKey("scanned_pages.id", ondelete="CASCADE"), nullable=False)
    page_order = Column(Integer, default=1)                      # Always 1 (single-page candidate)

    candidate = relationship("Candidate", back_populates="pages")
    scanned_page = relationship("ScannedPage", back_populates="candidate_links")

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    job_type = Column(String(50), default="qr_scan")      # qr_scan, pdf_generation, zip_export
    status = Column(String(50), default="pending")        # pending, running, completed, failed
    progress = Column(Float, default=0.0)                 # 0 to 100%
    current_step = Column(String(200), default="Initialized")
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    batch = relationship("Batch", back_populates="jobs")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(Integer, nullable=True)
    action = Column(String(100), nullable=False)  # qr_scan_complete, edit_register_number, resolve_duplicate, retry_qr
    details = Column(Text, nullable=True)
    operator = Column(String(100), default="Exam Operator")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    batch = relationship("Batch", back_populates="audit_logs")
