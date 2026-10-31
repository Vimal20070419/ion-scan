import re
import math
import os
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import fitz  # PyMuPDF
import cv2
import numpy as np
from PIL import Image

class OCREngine:
    def __init__(self):
        self.qr_detector = cv2.QRCodeDetector()
        
        # Stop words that can never be roll numbers
        self.roll_stopwords = {
            'along', 'should', 'carry', 'under', 'rules', 'valid', 'sheet',
            'instructions', 'examination', 'hall', 'ticket', 'centre', 'center',
            'session', 'admit', 'card', 'during', 'before', 'after', 'printed'
        }

        # Stop words that can never be candidate names
        self.name_stopwords = {
            'general instructions', 'continuation sheet', 'instructions',
            'examination', 'schedule', 'rules', 'conduct', 'advisory',
            'guidelines', 'covid', 'undertaking', 'declaration'
        }

        # Regex patterns for roll number - must contain at least one digit
        self.roll_patterns = [
            r'\bROLL:([A-Za-z0-9]+)\b', # From QR code payload
            r'(?:Roll\s*(?:No|Number|#)?|RollNo)[:\s]+((?=[A-Za-z0-9]*\d)[A-Za-z0-9]{4,25})\b',
            r'(?:Hall\s*Ticket\s*(?:No|Number|#)|HT\s*(?:No|Number|#)?)[:\s]+((?=[A-Za-z0-9]*\d)[A-Za-z0-9]{4,25})\b',
            r'(?:Registration\s*(?:No|Number|#)?|Reg\s*(?:No|Number|#)?)[:\s]+((?=[A-Za-z0-9\-]*\d)[A-Za-z0-9\-]{4,25})\b',
            r'(?:Candidate\s*(?:ID|Number)|Student\s*(?:ID|Roll))[:\s]+((?=[A-Za-z0-9\-]*\d)[A-Za-z0-9\-]{4,25})\b',
        ]

        self.name_patterns = [
            r'\bNAME:([A-Za-z\s\.]+)(?:\||$)', # From QR payload
            r'(?:Candidate\s*Name|Name\s*of\s*Candidate|Applicant\s*Name)[:\s]*([A-Za-z\s\.]{3,40})\b',
            r'(?:REFERENCE|Ref)[:\s]*([A-Za-z\s\.]{3,40})\b',
        ]

        self.page_patterns = [
            r'Page\s*(\d+)\s*(?:of|/)\s*(\d+)',
            r'Sheet\s*(\d+)\s*(?:of|/)\s*(\d+)',
            r'(\d+)\s*/\s*(\d+)\s*Pages?',
            r'\b(\d+)\s*of\s*(\d+)\b',
        ]

        self.first_page_titles = [
            'admit card', 'hall ticket', 'admission ticket', 'provisional hall ticket',
            'official hall ticket', 'examination admission ticket'
        ]

    def deskew_image(self, cv_img: np.ndarray) -> Tuple[np.ndarray, float]:
        """Calculates deskew angle and straightens the image using OpenCV."""
        try:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY) if len(cv_img.shape) == 3 else cv_img
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
            coords = np.column_stack(np.where(thresh > 0))
            if len(coords) < 100:
                return cv_img, 0.0

            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            else:
                angle = -angle

            if abs(angle) > 0.4 and abs(angle) < 25.0:
                (h, w) = cv_img.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(
                    cv_img, M, (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE
                )
                return rotated, round(float(angle), 2)
        except Exception:
            pass
        return cv_img, 0.0

    def detect_blank_page(self, cv_img: np.ndarray, threshold: float = 99.4) -> bool:
        """Determines if a scanned page is blank."""
        try:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY) if len(cv_img.shape) == 3 else cv_img
            white_pixels = np.sum(gray > 240)
            total_pixels = gray.size
            white_ratio = (white_pixels / total_pixels) * 100
            return white_ratio >= threshold
        except Exception:
            return False

    def decode_qr_or_barcode(self, cv_img: np.ndarray) -> Optional[str]:
        """Extracts QR codes using OpenCV detector."""
        try:
            val, points, _ = self.qr_detector.detectAndDecode(cv_img)
            if val and len(val.strip()) > 0:
                return val.strip()
        except Exception:
            pass
        return None

    def extract_text_and_features(
        self,
        pdf_page: fitz.Page,
        page_idx: int,
        save_img_dir: Path,
        batch_id: int
    ) -> Dict[str, Any]:
        """
        Extracts high-resolution image, PyMuPDF digital text layer, layout features,
        and parses roll numbers, candidate names, and page indicators.
        """
        # 1. Render image
        pix = pdf_page.get_pixmap(dpi=150)
        img_filename = f"batch_{batch_id}_page_{page_idx + 1}.jpg"
        img_path = save_img_dir / img_filename
        pix.save(str(img_path))

        cv_img = cv2.imread(str(img_path))
        is_blank = False
        skew_angle = 0.0
        qr_data = None

        if cv_img is not None:
            is_blank = self.detect_blank_page(cv_img)
            cv_img, skew_angle = self.deskew_image(cv_img)
            qr_data = self.decode_qr_or_barcode(cv_img)
            if abs(skew_angle) > 0.5:
                cv2.imwrite(str(img_path), cv_img)

        # 2. Extract text from PyMuPDF
        raw_text = pdf_page.get_text("text") or ""
        
        # 3. Parse page numbering ("Page X of Y") first
        current_page = None
        total_pages = None
        page_info_str = None

        for pattern in self.page_patterns:
            m = re.search(pattern, raw_text, re.IGNORECASE)
            if m:
                try:
                    p1 = int(m.group(1))
                    p2 = int(m.group(2))
                    if 1 <= p1 <= 20 and 1 <= p2 <= 50 and p1 <= p2:
                        current_page = p1
                        total_pages = p2
                        page_info_str = f"Page {p1} of {p2}"
                        break
                except ValueError:
                    pass

        # 4. Parse roll number
        recognized_roll = None
        roll_source = None

        # Check QR data first if available
        if qr_data:
            for pattern in self.roll_patterns:
                m = re.search(pattern, qr_data, re.IGNORECASE)
                if m:
                    cand_roll = m.group(1).strip()
                    if cand_roll.lower() not in self.roll_stopwords:
                        recognized_roll = cand_roll
                        roll_source = "QR_CODE"
                        break

        # Check text if not found in QR
        if not recognized_roll:
            for pattern in self.roll_patterns:
                m = re.search(pattern, raw_text, re.IGNORECASE)
                if m:
                    cand_roll = m.group(1).strip()
                    if cand_roll.lower() not in self.roll_stopwords:
                        recognized_roll = cand_roll
                        roll_source = "TEXT_LABEL"
                        break

        # 5. Parse candidate name
        recognized_name = None
        if qr_data:
            for pattern in self.name_patterns:
                m = re.search(pattern, qr_data, re.IGNORECASE)
                if m:
                    cand_name = m.group(1).strip()
                    if not any(sw in cand_name.lower() for sw in self.name_stopwords):
                        recognized_name = cand_name
                        break

        if not recognized_name:
            for pattern in self.name_patterns:
                m = re.search(pattern, raw_text, re.IGNORECASE)
                if m:
                    cand_name = m.group(1).strip()
                    cand_name = re.split(r'[\r\n,;]', cand_name)[0].strip()
                    if len(cand_name) > 2 and not any(sw in cand_name.lower() for sw in self.name_stopwords):
                        recognized_name = cand_name
                        break

        # 6. First page indicator detection
        # Header text from first ~500 chars
        header_text = raw_text[:500].lower()
        is_first_page = False
        
        if current_page == 1:
            is_first_page = True
        elif current_page is not None and current_page > 1:
            # If explicit page number says Page 2, 3, etc., it cannot be a first page
            is_first_page = False
        else:
            # If no explicit page number, check if header contains primary hall ticket title
            if any(title in header_text for title in self.first_page_titles) and recognized_roll:
                is_first_page = True

        # 7. Confidence Score Calculation
        confidence = 0.0
        if is_blank:
            confidence = 10.0
            status = "blank"
        elif recognized_roll:
            if roll_source == "QR_CODE":
                confidence = 99.0
                status = "verified"
            else:
                confidence = 95.0 if is_first_page else 88.0
                status = "verified"
        elif current_page and current_page > 1:
            # Continuation page without roll number
            confidence = 85.0
            status = "continuation"
        elif recognized_name:
            confidence = 70.0
            status = "review_needed"
        else:
            confidence = 30.0
            status = "review_needed"

        return {
            "original_page_number": page_idx + 1,
            "page_image_path": f"/static/pages/{img_filename}",
            "ocr_text": raw_text.strip(),
            "recognized_roll_number": recognized_roll,
            "recognized_name": recognized_name,
            "recognized_page_info": page_info_str,
            "detected_current_page": current_page,
            "detected_total_pages": total_pages,
            "is_first_page_indicator": is_first_page,
            "confidence_score": confidence,
            "verification_status": status,
            "is_blank": is_blank,
            "skew_angle": skew_angle
        }

ocr_engine = OCREngine()
