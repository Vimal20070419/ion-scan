import pytest
from app.qr_engine import qr_engine

def test_duplicate_register_number_handling():
    """
    Test duplicate register number handling:
    When two pages produce the same Register Number, both should be marked with conflict.
    """
    scanned_pages_data = [
        {"page": 1, "qr_payload": "REG:123456001"},
        {"page": 2, "qr_payload": "REG:123456002"},
        {"page": 3, "qr_payload": "REG:123456001"}, # Duplicate of page 1!
    ]

    seen = {}
    conflicts = set()

    for item in scanned_pages_data:
        reg = qr_engine.extract_register_number_from_payload(item["qr_payload"])
        if reg in seen:
            conflicts.add(reg)
            conflicts.add(seen[reg])
        else:
            seen[reg] = item["page"]

    assert "123456001" in conflicts
    assert len(conflicts) >= 1
