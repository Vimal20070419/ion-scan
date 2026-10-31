import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine, SessionLocal
from .models import User, Batch
from .routes import batches, upload, scanner, qr_scanner, candidates, export, stats, auth, ocr

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent ADF Bulk Hall Ticket QR Scanner & Automatic PDF Generator (1 Page = 1 Candidate)"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder for scanned page preview thumbnails
app.mount("/static/pages", StaticFiles(directory=str(settings.PAGES_PATH)), name="pages")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(batches.router, prefix=settings.API_V1_STR)
app.include_router(upload.router, prefix=settings.API_V1_STR)
app.include_router(scanner.router, prefix=settings.API_V1_STR)
app.include_router(qr_scanner.router, prefix=settings.API_V1_STR)
app.include_router(candidates.router, prefix=settings.API_V1_STR)
app.include_router(export.router, prefix=settings.API_V1_STR)
app.include_router(stats.router, prefix=settings.API_V1_STR)
# Retain /ocr for backward compatibility redirecting to QR scan
app.include_router(ocr.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "mode": "QR Code Recognition (1 Page = 1 Candidate)",
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs"
    }

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            default_user = User(
                username="admin",
                password_hash="admin123",
                role="admin"
            )
            db.add(default_user)
            db.commit()
    finally:
        db.close()
