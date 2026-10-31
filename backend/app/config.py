import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"

class Settings(BaseSettings):
    PROJECT_NAME: str = "HallTicket Pro"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/hallticket_pro.db")
    
    # Storage
    STORAGE_PATH: Path = STORAGE_DIR
    UPLOAD_PATH: Path = STORAGE_DIR / "uploads"
    PAGES_PATH: Path = STORAGE_DIR / "pages"
    OUTPUT_PATH: Path = STORAGE_DIR / "output"
    ZIP_PATH: Path = STORAGE_DIR / "zips"
    SAMPLES_PATH: Path = STORAGE_DIR / "samples"
    
    # Processing Defaults
    PRIMARY_ID_FIELD: str = "Roll Number"
    CONFIDENCE_HIGH: float = 85.0
    CONFIDENCE_MEDIUM: float = 60.0
    
    # Scanner Configuration Defaults
    SCANNER_DPI: int = 300
    SCANNER_COLOR_MODE: str = "color"  # color, grayscale, bw
    SCANNER_SOURCE: str = "ADF Front & Back"
    SCANNER_PAPER_SIZE: str = "A4"
    AUTO_DESKEW: bool = True
    BLANK_PAGE_DETECTION: bool = True
    BLANK_THRESHOLD: float = 99.2
    
    class Config:
        case_sensitive = True

settings = Settings()

# Ensure directories exist
for path in [
    settings.STORAGE_PATH,
    settings.UPLOAD_PATH,
    settings.PAGES_PATH,
    settings.OUTPUT_PATH,
    settings.ZIP_PATH,
    settings.SAMPLES_PATH
]:
    path.mkdir(parents=True, exist_ok=True)
