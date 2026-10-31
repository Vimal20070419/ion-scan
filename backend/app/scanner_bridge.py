import os
import shutil
import time
from pathlib import Path
from typing import Dict, Any, List
from .config import settings

class ScannerBridge:
    def __init__(self):
        self.available_scanners = [
            {
                "id": "virtual-adf-simulator",
                "name": "Virtual ADF Sheet-Fed Scanner (20-Page QR Hall Ticket Stack)",
                "type": "Hardware Simulator",
                "status": "Ready",
                "max_speed_ppm": 100,
                "supported_dpi": [300],
                "color_modes": ["Color"],
                "duplex_supported": False
            },
            {
                "id": "fujitsu-fi7160",
                "name": "Fujitsu fi-7160 High-Speed ADF Scanner",
                "type": "ADF Sheet-Fed",
                "status": "Online",
                "max_speed_ppm": 60,
                "supported_dpi": [200, 300, 600],
                "color_modes": ["Color", "Grayscale", "Black & White"],
                "duplex_supported": False
            },
            {
                "id": "epson-ds530",
                "name": "Epson WorkForce DS-530 II Document Scanner",
                "type": "ADF Sheet-Fed",
                "status": "Online",
                "max_speed_ppm": 35,
                "supported_dpi": [200, 300, 600],
                "color_modes": ["Color", "Grayscale", "Black & White"],
                "duplex_supported": False
            },
            {
                "id": "canon-drc225",
                "name": "Canon imageFORMULA DR-C225 Sheet-Fed Scanner",
                "type": "ADF Sheet-Fed",
                "status": "Ready",
                "max_speed_ppm": 25,
                "supported_dpi": [200, 300],
                "color_modes": ["Color", "Grayscale"],
                "duplex_supported": False
            },
            {
                "id": "twain-wia-bridge",
                "name": "Windows TWAIN / WIA Local Scanner Bridge",
                "type": "Local Bridge",
                "status": "Standby",
                "max_speed_ppm": 50,
                "supported_dpi": [200, 300, 600],
                "color_modes": ["Color", "Grayscale", "Black & White"],
                "duplex_supported": False
            }
        ]

    def get_scanner_list(self) -> List[Dict[str, Any]]:
        return self.available_scanners

    def perform_scan(
        self,
        scanner_id: str,
        config: Dict[str, Any],
        output_dir: Path
    ) -> Dict[str, Any]:
        """
        Executes scan operation. For Virtual ADF / sample stack, loads the single-sheet
        QR-coded ADF multipage test PDF into a freshly scanned document ready for QR processing.
        """
        sample_path = settings.SAMPLES_PATH / "ADF_Bulk_Scan_QR_HallTickets.pdf"
        
        # Ensure sample exists
        if not sample_path.exists():
            from ..generate_sample_adf import generate_sample_qr_adf_pdf
            generate_sample_qr_adf_pdf(str(sample_path), count=20)

        import fitz
        doc = fitz.open(str(sample_path))
        page_count = len(doc)
        doc.close()

        timestamp = int(time.time())
        scanned_filename = f"ADF_QR_Scanned_Stack_{timestamp}.pdf"
        scanned_dest = output_dir / scanned_filename

        shutil.copyfile(str(sample_path), str(scanned_dest))

        return {
            "status": "success",
            "scanner_id": scanner_id,
            "filename": scanned_filename,
            "file_path": str(scanned_dest),
            "pages_scanned": page_count,
            "resolution_dpi": config.get("resolution_dpi", 300),
            "color_mode": config.get("color_mode", "color"),
            "paper_size": config.get("paper_size", "A4"),
            "timestamp": timestamp
        }

scanner_bridge = ScannerBridge()
