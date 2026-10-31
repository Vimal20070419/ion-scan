import os
import zipfile
import fitz
import pytest
from pathlib import Path
from app.config import settings
from app.pdf_engine import pdf_engine

def test_single_page_pdf_generation_and_zip():
    sample_pdf = settings.SAMPLES_PATH / "ADF_Bulk_Scan_QR_HallTickets.pdf"
    assert sample_pdf.exists(), "Sample QR ADF PDF must exist"

    test_out_dir = settings.OUTPUT_PATH / "test_qr_run"
    test_out_dir.mkdir(parents=True, exist_ok=True)

    # Test Candidate 1: single sheet Page 1
    pages_cand1 = [{"source_file_path": str(sample_pdf), "original_page_number": 1}]
    cand1_pdf = pdf_engine.generate_candidate_pdf("123456001", pages_cand1, test_out_dir)
    assert os.path.exists(cand1_pdf)
    assert os.path.basename(cand1_pdf) == "123456001.pdf"
    doc1 = fitz.open(cand1_pdf)
    assert len(doc1) == 1, f"ONE SCANNED PAGE = ONE PDF: Expected 1 page, got {len(doc1)}"
    doc1.close()

    # Test Candidate 2: single sheet Page 2
    pages_cand2 = [{"source_file_path": str(sample_pdf), "original_page_number": 2}]
    cand2_pdf = pdf_engine.generate_candidate_pdf("123456002", pages_cand2, test_out_dir)
    assert os.path.basename(cand2_pdf) == "123456002.pdf"
    doc2 = fitz.open(cand2_pdf)
    assert len(doc2) == 1
    doc2.close()

    # Test ZIP packaging
    candidate_records = [
        ("123456001", cand1_pdf),
        ("123456002", cand2_pdf),
    ]
    zip_dir = settings.ZIP_PATH / "test_qr_zips"
    zip_dir.mkdir(parents=True, exist_ok=True)
    zip_path, size_mb, count = pdf_engine.create_batch_zip("HallTickets", candidate_records, zip_dir)

    assert os.path.exists(zip_path)
    assert count == 2
    assert size_mb > 0

    with zipfile.ZipFile(zip_path, 'r') as zf:
        namelist = zf.namelist()
        assert "123456001.pdf" in namelist
        assert "123456002.pdf" in namelist
        assert zf.testzip() is None
