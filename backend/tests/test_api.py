from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_qr_scanner_workflow():
    # 1. Scanner devices check
    res = client.get("/api/scanner/devices")
    assert res.status_code == 200
    devices = res.json()
    assert len(devices) > 0

    # 2. Trigger scanner feed of QR stack
    scan_payload = {
        "scanner_name": "Virtual ADF Sheet-Fed Scanner (20-Page QR Hall Ticket Stack)",
        "paper_size": "A4",
        "resolution_dpi": 300,
        "color_mode": "color",
        "duplex": False,
        "auto_rotate": True,
        "blank_detection": True,
        "deskew": True
    }
    scan_res = client.post("/api/scanner/scan", json=scan_payload)
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    batch_id = scan_data["batch_id"]
    assert scan_data["pages_scanned"] == 20

    # 3. Process QR Code Pipeline (Replaced OCR)
    qr_res = client.post(f"/api/qr/process/{batch_id}")
    assert qr_res.status_code == 200
    qr_data = qr_res.json()
    assert qr_data["total_pages"] == 20
    assert qr_data["total_candidates"] == 20
    assert qr_data["decoded_qr_count"] == 20
    assert qr_data["failed_qr_count"] == 0

    # 4. Check Candidates: ONE PAGE = ONE CANDIDATE = ONE REGISTER NUMBER
    cands_res = client.get(f"/api/candidates/batch/{batch_id}")
    assert cands_res.status_code == 200
    cands = cands_res.json()
    assert len(cands) == 20

    for idx, c in enumerate(cands):
        expected_reg = f"123456{idx + 1:03d}"
        assert c["roll_number"] == expected_reg
        assert c["page_count"] == 1
        assert c["verification_status"] == "verified"
        assert c["has_conflict"] is False

    # 5. Generate Individual PDFs
    pdf_res = client.post(f"/api/export/batch/{batch_id}/generate-pdfs")
    assert pdf_res.status_code == 200
    pdf_data = pdf_res.json()
    assert pdf_data["total_pdfs_generated"] == 20
    # Verify naming convention: {register_number}.pdf
    for item in pdf_data["candidates"]:
        assert item["pdf_filename"] == f"{item['register_number']}.pdf"

    # 6. Generate ZIP Archive: HallTickets.zip
    zip_res = client.post(f"/api/export/batch/{batch_id}/generate-zip")
    assert zip_res.status_code == 200
    zip_data = zip_res.json()
    assert zip_data["file_count"] == 20
    assert zip_data["size_mb"] > 0

    # 7. CSV Export
    csv_res = client.get(f"/api/export/batch/{batch_id}/export-csv")
    assert csv_res.status_code == 200
    csv_content = csv_res.content.decode('utf-8')
    assert "Register_Number" in csv_content
    assert "123456001" in csv_content
    assert "123456020" in csv_content
