# HallTicket Pro – ADF Bulk Scanner & Intelligent QR Code Recognition System

**HallTicket Pro** is a production-ready examination center web application engineered specifically for Automatic Document Feeder (ADF) sheet-fed document scanners.

In the modernized examination workflow, each candidate has **exactly ONE hall ticket page**, and every hall ticket contains a **QR code** encoding the candidate's **Register Number**. HallTicket Pro replaces legacy OCR with high-speed, noise-tolerant QR code detection and decoding to enforce the golden rule:

> **ONE SCANNED PAGE = ONE CANDIDATE = ONE QR CODE = ONE REGISTER-NUMBER-NAMED PDF**

All processed individual PDFs are packaged together into a unified `HallTickets.zip` archive.

---

## 🌟 Key Capabilities

1. **Multi-Tier QR Code Detection & Decoding Engine**:
   - Primary decoding via `pyzbar` / ZBar with OpenCV `QRCodeDetector` fallback.
   - Automated preprocessing pipeline for degraded, low-contrast, or blurred ADF scans:
     - **CLAHE** (Contrast Limited Adaptive Histogram Equalization)
     - **Otsu Binarization**
     - **Adaptive Gaussian Thresholding**
     - **Morphological Closing** (to heal broken finder patterns)
   - **Rotation Invariance**: Automatically tests 90°, 180°, and 270° rotations to decode sideways or inverted sheet feeds.
   - **Resolution Fallback**: Automatically re-renders problematic sheets at 300 DPI if initial decoding fails.

2. **Universal Register Number Extraction Parser**:
   - Supports plain-text register numbers (e.g. `123456001`).
   - Supports structured key-value payloads (e.g. `REG:123456001|NAME:Priya Patel|EXAM:ENG-101`).
   - Supports JSON dictionary payloads (e.g. `{"register_number": "123456001", "candidate_name": "Aarav Sharma"}`).
   - Supports URL-based verification payloads (e.g. `https://exam.gov.in/verify?reg=123456001&center=CHN04`).
   - Extracts *only* the valid Register Number for the filename; never uses entire raw URLs or payloads.

3. **1 Page = 1 Candidate = 1 PDF Architecture**:
   - Every scanned sheet represents exactly one candidate.
   - Variable grouping, continuation detection, and candidate page merging have been cleanly removed.
   - Generates individual single-page PDFs named `<register_number>.pdf` (e.g. `123456001.pdf`).
   - Lossless page extraction using PyMuPDF (`fitz`) `insert_pdf()` preserves 100% of the original scan quality, dimensions, and resolution.

4. **Duplicate Register Number Conflict Protection**:
   - If two different pages produce the same Register Number, the system flags a duplicate conflict.
   - Halts automatic ZIP archive packaging until the operator resolves the conflict.
   - Operator can preview both sheets side-by-side, edit the Register Number manually, or delete erroneous records.

5. **Interactive QR Scanning Results Dashboard**:
   - **Real-time KPI Counters**: Total Uploaded Pages, Successfully Decoded QR Codes, Failed Detections, Duplicate Conflicts, and Generated PDFs.
   - **Results Table**: Page #, Scanned Sheet Thumbnail, Decoded Register Number, QR Status (`Success` / `QR Not Detected`), PDF Status (`Generated` / `Review`), and Actions.
   - **Modal Inspection**: Full high-resolution sheet viewer with dual tabs:
     - *Scanned Sheet View*: Zoom, rotate, and inspect page graphics.
     - *Decoded QR Payload*: Displays raw payload, parsed register number, and decoder engine metadata.
   - **Operator Controls**: Retry QR decoding with 300 DPI preprocessing, manual Register Number edit modal, download individual PDF, and delete record.

6. **Single-Click ZIP Packaging & CSV Export**:
   - Download all approved PDFs in a single click as `HallTickets.zip`.
   - Export full Register Number audit log as CSV (`Page_Number,Register_Number,Candidate_Name,QR_Status,Verification_Status,PDF_Generated,Filename`).
   - Download individual candidate PDFs on demand.

7. **ADF Scanner Integration & Simulator**:
   - Hardware bridge support for Windows TWAIN / WIA and SANE document scanners.
   - Built-in Virtual ADF Sheet-Fed Scanner simulator preloaded with a 20-sheet multipage test stack featuring diverse QR payload formats (plain, structured, JSON, and URL).

---

## 📁 Project Architecture

```
ion scan/
├── backend/
│   ├── app/
│   │   ├── config.py            # Storage directories and application settings
│   │   ├── database.py          # SQLAlchemy session engine & SQLite setup
│   │   ├── models.py            # DB models: Batch, ScannedPage, Candidate, CandidatePage, AuditLog
│   │   ├── schemas.py           # Pydantic schemas for QR status, candidate, and batch outputs
│   │   ├── qr_engine.py         # Multi-tier QR scanner, preprocessors, and payload parser
│   │   ├── pdf_engine.py        # Lossless single-page PDF generator & ZIP packager
│   │   ├── scanner_bridge.py    # ADF sheet feeder bridge and 20-page QR stack simulator
│   │   └── routes/
│   │       ├── qr_scanner.py    # POST /api/qr/process/{batch_id}, POST /api/qr/retry-page/{page_id}
│   │       ├── candidates.py    # GET, PUT (manual register edit), DELETE candidate endpoints
│   │       ├── export.py        # generate-pdfs, generate-zip, download-zip, export-csv
│   │       ├── scanner.py       # Scanner device enumeration and scan triggers
│   │       ├── upload.py        # Multipage PDF ADF bulk upload
│   │       └── stats.py         # Real-time dashboard KPI statistics
│   ├── tests/
│   │   ├── test_qr_engine.py    # Multi-format QR payload parsing & multi-decoder tests
│   │   ├── test_pdf_generation.py # Lossless single-sheet PDF generation & ZIP tests
│   │   ├── test_duplicate_qr.py # Duplicate Register Number detection and conflict tests
│   │   └── test_api.py          # End-to-end QR scan, candidate creation, and ZIP export tests
│   ├── generate_sample_adf.py   # Generator for 20-page QR hall ticket test stack PDF
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx       # Header, active batch selector, dark/light mode toggle
│   │   │   ├── Sidebar.tsx      # Navigation tabs and QR Code Rule card
│   │   │   ├── PageThumbnail.tsx # Thumbnail preview with QR status badges
│   │   │   └── PDFViewerModal.tsx # Full sheet inspector with raw QR payload tab
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Processing center overview and KPI cards
│   │   │   ├── ScannerConfig.tsx # ADF feeder settings and 20-page QR feed simulation
│   │   │   ├── BulkUpload.tsx   # Drag-and-drop multipage PDF upload
│   │   │   ├── QRValidationDashboard.tsx # QR results table, filters, manual editing, and retries
│   │   │   ├── PDFManagement.tsx # Final candidate PDF listing and HallTickets.zip download
│   │   │   ├── HistoryView.tsx  # Immutable audit logs
│   │   │   └── SettingsView.tsx # System parameters and hardware configuration
│   │   ├── api/client.ts        # Type-safe API client for QR endpoints
│   │   └── types/index.ts       # TypeScript models including QR statuses
│   ├── tailwind.config.js       # Modern Tailwind theme
│   └── vite.config.ts           # Development proxy to backend (:8000)
└── storage/
    ├── uploads/                 # Original scanned multipage ADF PDFs
    ├── pages/                   # Rendered high-res sheet previews
    ├── output/                  # Final individual candidate PDFs (<register_number>.pdf)
    ├── zips/                    # Packaged HallTickets.zip archives
    └── samples/                 # Sample ADF multipage PDFs (20-page QR test stack)
```

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ & npm

### 2. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open web application at: `http://127.0.0.1:5173/`

### 4. Running Automated Tests
```bash
python -m pytest
```

---

## 📋 End-to-End Operator Workflow

1. **Scan or Upload**:
   - Place scanned sheets in ADF scanner or upload multipage PDF (e.g. `Bulk_Scan.pdf`).
   - The scanner feeds all sheets into a single multipage document.
2. **Automatic QR Scanning**:
   - Backend extracts each page and runs the multi-tier QR recognition engine (`pyzbar` + OpenCV).
   - If a QR code is tilted, degraded, or low contrast, image preprocessing (CLAHE, Otsu, Gaussian adaptive threshold, 90°/180° rotation) is automatically applied.
3. **Register Number Extraction**:
   - The configurable parser strips formatting, URLs, and JSON keys, isolating the exact Register Number (e.g. `123456001`).
4. **Duplicate & Error Review**:
   - The QR Scanning Results Dashboard displays status for every page.
   - If duplicates or unreadable QR codes occur, the operator can manually enter the Register Number or retry with high-resolution 300 DPI preprocessing.
5. **PDF Generation & ZIP Archive Download**:
   - Each page is extracted losslessly as an individual PDF named `<register_number>.pdf`.
   - All candidate PDFs are packaged into `HallTickets.zip` for instant one-click download.
   - Operators can also export the complete candidate list as CSV.
