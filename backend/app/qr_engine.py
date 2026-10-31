import re
import json
import urllib.parse
from typing import Optional, Tuple, Dict, Any, List
from pathlib import Path
import cv2
import numpy as np
import fitz  # PyMuPDF
from PIL import Image

try:
    from pyzbar import pyzbar
    HAS_PYZBAR = True
except ImportError:
    HAS_PYZBAR = False


class QREngine:
    def __init__(self):
        self.cv_qr_detector = cv2.QRCodeDetector()
        
        # Regex patterns to extract register number from various payload formats
        self.reg_key_patterns = [
            r'(?:register[_\-\s]*number|reg[_\-\s]*no|reg[_\-\s]*num|registration[_\-\s]*no|registration[_\-\s]*number)[:=\s]+([A-Za-z0-9\-_]{4,30})\b',
            r'\bREG:([A-Za-z0-9\-_]{4,30})\b',
            r'\bROLL:([A-Za-z0-9\-_]{4,30})\b',
            r'(?:roll[_\-\s]*number|roll[_\-\s]*no)[:=\s]+([A-Za-z0-9\-_]{4,30})\b',
            r'(?:candidate[_\-\s]*id|student[_\-\s]*id)[:=\s]+([A-Za-z0-9\-_]{4,30})\b',
            r'\bID:([A-Za-z0-9\-_]{4,30})\b',
        ]

    def extract_register_number_from_payload(self, raw_payload: str) -> Optional[str]:
        """
        Parses the raw decoded QR string and extracts ONLY the Register Number.
        Handles:
        1. JSON payloads: {"register_number": "123456001", ...}
        2. URL-based payloads: https://exam.gov.in/verify?reg=123456001 or .../candidate/123456001
        3. Structured payloads: REG:123456001|NAME:John
        4. Plain text register numbers: 123456001
        """
        if not raw_payload or not raw_payload.strip():
            return None

        clean_text = raw_payload.strip()

        # 1. Try parsing as JSON
        if clean_text.startswith('{') and clean_text.endswith('}'):
            try:
                data = json.loads(clean_text)
                if isinstance(data, dict):
                    # Check common register number keys
                    for key in [
                        'register_number', 'reg_no', 'reg_number', 'registration_number',
                        'registration_no', 'roll_number', 'roll_no', 'roll', 'candidate_id',
                        'regNo', 'registerNumber', 'rollNumber', 'id'
                    ]:
                        if key in data and data[key]:
                            val = str(data[key]).strip()
                            if self._is_valid_register_number(val):
                                return val
            except Exception:
                pass

        # 2. Try parsing as URL
        if clean_text.startswith('http://') or clean_text.startswith('https://'):
            try:
                parsed_url = urllib.parse.urlparse(clean_text)
                # Check query parameters
                query_params = urllib.parse.parse_qs(parsed_url.query)
                for q_key in ['reg', 'reg_no', 'reg_number', 'roll', 'roll_no', 'id', 'candidate']:
                    if q_key in query_params and query_params[q_key]:
                        candidate_val = query_params[q_key][0].strip()
                        if self._is_valid_register_number(candidate_val):
                            return candidate_val

                # Check URL path segments (e.g. /hallticket/123456001)
                path_parts = [p.strip() for p in parsed_url.path.split('/') if p.strip()]
                if path_parts:
                    last_part = path_parts[-1]
                    if self._is_valid_register_number(last_part):
                        return last_part
            except Exception:
                pass

        # 3. Try structured patterns (e.g. REG:123456001|NAME:...)
        for pat in self.reg_key_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                if self._is_valid_register_number(cand):
                    return cand

        # 4. Try delimited formats (e.g. key=value or key:value across pipes or commas or semicolons)
        tokens = re.split(r'[|,;\n\r]+', clean_text)
        for token in tokens:
            token = token.strip()
            if '=' in token:
                k, v = token.split('=', 1)
                k_clean = k.strip().lower()
                if any(x in k_clean for x in ['reg', 'roll', 'id', 'candidate']):
                    val = v.strip()
                    if self._is_valid_register_number(val):
                        return val
            elif ':' in token:
                k, v = token.split(':', 1)
                k_clean = k.strip().lower()
                if any(x in k_clean for x in ['reg', 'roll', 'id', 'candidate']):
                    val = v.strip()
                    if self._is_valid_register_number(val):
                        return val

        # 5. Check if the entire payload is a clean, single register number (e.g. "123456001" or "REG2026-901")
        if self._is_valid_register_number(clean_text) and len(clean_text.split()) == 1:
            return clean_text

        # 6. Fallback regex to search for standalone alphanumeric registration sequence (e.g. 5-20 digits/alphanumeric)
        m = re.search(r'\b([A-Za-z0-9\-_]{5,25})\b', clean_text)
        if m and self._is_valid_register_number(m.group(1)):
            return m.group(1)

        return None

    def _is_valid_register_number(self, val: str) -> bool:
        """Validates that candidate string is a plausible register number."""
        if not val or len(val) < 3 or len(val) > 40:
            return False
        # Must contain alphanumeric characters (at least one letter or digit)
        if not any(c.isalnum() for c in val):
            return False
        # Exclude common protocol strings or dummy words
        stopwords = {'http', 'https', 'null', 'undefined', 'true', 'false', 'none', 'admin'}
        if val.lower() in stopwords:
            return False
        return True

    def decode_image_qr(self, cv_img: np.ndarray) -> Optional[Tuple[str, str]]:
        """
        Attempts to detect and decode QR code from an OpenCV image.
        Returns tuple of (decoded_payload, decoder_name) or None.
        """
        # Tier 1: Try pyzbar
        if HAS_PYZBAR:
            try:
                decoded_objs = pyzbar.decode(cv_img)
                for obj in decoded_objs:
                    if obj.type == 'QRCODE' or 'QR' in obj.type:
                        payload = obj.data.decode('utf-8', errors='ignore').strip()
                        if payload:
                            return payload, "pyzbar"
            except Exception:
                pass

        # Tier 2: Try OpenCV QRCodeDetector
        try:
            val, points, _ = self.cv_qr_detector.detectAndDecode(cv_img)
            if val and len(val.strip()) > 0:
                return val.strip(), "opencv"
        except Exception:
            pass

        return None

    def decode_with_preprocessing_fallback(self, cv_img: np.ndarray) -> Optional[Tuple[str, str]]:
        """
        Multi-tier fallback decoding pipeline:
        1. Direct attempt
        2. Grayscale + CLAHE contrast enhancement
        3. Otsu thresholding
        4. Adaptive thresholding
        5. Morphological closing (fixes blurry module gaps)
        6. Multi-angle rotations (90°, 180°, 270°)
        7. 1.5x upscaling for small QR codes
        """
        # 1. Direct
        res = self.decode_image_qr(cv_img)
        if res:
            return res

        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY) if len(cv_img.shape) == 3 else cv_img

        # 2. CLAHE contrast enhancement
        try:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            res = self.decode_image_qr(enhanced)
            if res:
                return res[0], f"{res[1]}+clahe"
        except Exception:
            pass

        # 3. Otsu's thresholding
        try:
            _, thresh_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            res = self.decode_image_qr(thresh_otsu)
            if res:
                return res[0], f"{res[1]}+otsu"
        except Exception:
            pass

        # 4. Adaptive thresholding
        try:
            adapt = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 5
            )
            res = self.decode_image_qr(adapt)
            if res:
                return res[0], f"{res[1]}+adaptive"
        except Exception:
            pass

        # 5. Morphological closing
        try:
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            closed = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
            res = self.decode_image_qr(closed)
            if res:
                return res[0], f"{res[1]}+morphology"
        except Exception:
            pass

        # 6. Rotations (90°, 180°, 270°) for sheets scanned sideways or inverted
        for angle in [90, 180, 270]:
            try:
                if angle == 90:
                    rot = cv2.rotate(gray, cv2.ROTATE_90_CLOCKWISE)
                elif angle == 180:
                    rot = cv2.rotate(gray, cv2.ROTATE_180)
                else:
                    rot = cv2.rotate(gray, cv2.ROTATE_90_COUNTERCLOCKWISE)

                res = self.decode_image_qr(rot)
                if res:
                    return res[0], f"{res[1]}+rot{angle}"
            except Exception:
                pass

        # 7. Scale up 1.5x
        try:
            h, w = gray.shape[:2]
            scaled = cv2.resize(gray, (int(w * 1.5), int(h * 1.5)), interpolation=cv2.INTER_CUBIC)
            res = self.decode_image_qr(scaled)
            if res:
                return res[0], f"{res[1]}+scaled"
        except Exception:
            pass

        return None

    def process_pdf_page(
        self,
        pdf_page: fitz.Page,
        page_idx: int,
        save_img_dir: Path,
        batch_id: int
    ) -> Dict[str, Any]:
        """
        Renders the PDF page to image, detects and decodes the QR code,
        and extracts the exact candidate Register Number.
        """
        # Render high-resolution preview image (150 DPI default)
        pix = pdf_page.get_pixmap(dpi=150)
        img_filename = f"batch_{batch_id}_page_{page_idx + 1}.jpg"
        img_path = save_img_dir / img_filename
        pix.save(str(img_path))

        cv_img = cv2.imread(str(img_path))
        raw_payload = None
        decoder_info = None
        register_number = None
        status = "failed"

        if cv_img is not None:
            decode_result = self.decode_with_preprocessing_fallback(cv_img)
            
            # If 150 DPI failed, try high-res 300 DPI render as ultimate fallback
            if not decode_result:
                try:
                    pix300 = pdf_page.get_pixmap(dpi=300)
                    img300_path = save_img_dir / f"batch_{batch_id}_page_{page_idx + 1}_300.jpg"
                    pix300.save(str(img300_path))
                    cv300 = cv2.imread(str(img300_path))
                    if cv300 is not None:
                        decode_result = self.decode_with_preprocessing_fallback(cv300)
                    if img300_path.exists():
                        img300_path.unlink()
                except Exception:
                    pass

            if decode_result:
                raw_payload, decoder_info = decode_result
                register_number = self.extract_register_number_from_payload(raw_payload)
                if register_number:
                    status = "success"
                else:
                    status = "payload_unparsed"
            else:
                status = "qr_not_detected"

        # Candidate name extraction from structured payload if present
        candidate_name = None
        if raw_payload:
            m = re.search(r'(?:NAME|CANDIDATE)[:=\s]+([A-Za-z\s\.]{3,40})(?:\||\n|$)', raw_payload, re.IGNORECASE)
            if m:
                candidate_name = m.group(1).strip()
            elif raw_payload.startswith('{'):
                try:
                    data = json.loads(raw_payload)
                    for k in ['name', 'candidate_name', 'student_name']:
                        if k in data and data[k]:
                            candidate_name = str(data[k]).strip()
                            break
                except Exception:
                    pass

        return {
            "page_number": page_idx + 1,
            "page_image_path": f"/static/pages/{img_filename}",
            "qr_status": status,  # success, qr_not_detected, payload_unparsed
            "raw_payload": raw_payload,
            "decoder_info": decoder_info,
            "register_number": register_number,
            "candidate_name": candidate_name or f"Candidate P{page_idx + 1:03d}",
            "is_valid": status == "success"
        }


qr_engine = QREngine()
