import io
import pytest
import qrcode
import cv2
import numpy as np
from PIL import Image
from app.qr_engine import qr_engine

def test_qr_payload_extraction():
    # 1. Plain
    assert qr_engine.extract_register_number_from_payload("123456001") == "123456001"
    assert qr_engine.extract_register_number_from_payload("REG-2026-00109") == "REG-2026-00109"

    # 2. Structured
    assert qr_engine.extract_register_number_from_payload("ROLL:123456002|NAME:Priya Patel") == "123456002"
    assert qr_engine.extract_register_number_from_payload("REG:123456003|CENTER:104") == "123456003"
    assert qr_engine.extract_register_number_from_payload("REG_NO=123456004;DOB=2003-08-14") == "123456004"

    # 3. JSON
    json_payload = '{"register_number": "123456005", "candidate_name": "Vikram Malhotra"}'
    assert qr_engine.extract_register_number_from_payload(json_payload) == "123456005"

    json_payload_reg = '{"reg_no": "123456006", "center": "Hall A"}'
    assert qr_engine.extract_register_number_from_payload(json_payload_reg) == "123456006"

    # 4. URL
    url_payload1 = "https://exam.gov.in/verify?reg=123456007"
    assert qr_engine.extract_register_number_from_payload(url_payload1) == "123456007"

    url_payload2 = "https://portal.education.gov.in/hallticket/123456008"
    assert qr_engine.extract_register_number_from_payload(url_payload2) == "123456008"

def test_qr_image_decoding_with_rotations():
    # Generate an actual QR code image with roll number
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data("REG:123456099|NAME:Test Candidate")
    qr.make(fit=True)
    pil_img = qr.make_image(fill_color="black", back_color="white")
    
    cv_img = cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)

    # 1. Normal orientation
    res = qr_engine.decode_with_preprocessing_fallback(cv_img)
    assert res is not None
    payload, decoder = res
    assert "123456099" in payload

    # 2. Rotated 90 degrees clockwise (e.g. sheet fed sideways)
    rot_90 = cv2.rotate(cv_img, cv2.ROTATE_90_CLOCKWISE)
    res_rot = qr_engine.decode_with_preprocessing_fallback(rot_90)
    assert res_rot is not None
    payload_rot, _ = res_rot
    assert "123456099" in payload_rot
    assert qr_engine.extract_register_number_from_payload(payload_rot) == "123456099"
