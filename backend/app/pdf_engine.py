import os
import zipfile
import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
from .config import settings

class PDFEngine:
    def __init__(self):
        pass

    def generate_candidate_pdf(
        self,
        roll_number: str,
        source_pages: List[Dict[str, Any]],
        output_dir: Path
    ) -> str:
        """
        Losslessly extracts and merges the candidate's pages from the original scanned documents.
        Never re-compresses or degrades resolution.
        Saves as {roll_number}.pdf
        """
        clean_roll = "".join(c for c in roll_number if c.isalnum() or c in ("-", "_"))
        if not clean_roll:
            clean_roll = f"candidate_{int(datetime.datetime.utcnow().timestamp())}"
        
        pdf_filename = f"{clean_roll}.pdf"
        output_path = output_dir / pdf_filename

        # Create a new PyMuPDF document
        out_doc = fitz.open()

        # Cache open source docs to avoid repeated disk reads
        open_docs = {}

        try:
            for p_info in source_pages:
                src_path = p_info["source_file_path"]
                page_idx = p_info["original_page_number"] - 1 # 0-indexed

                if src_path not in open_docs:
                    open_docs[src_path] = fitz.open(src_path)

                src_doc = open_docs[src_path]
                if 0 <= page_idx < len(src_doc):
                    # insert_pdf preserves original page stream, fonts, vectors, images without quality loss
                    out_doc.insert_pdf(src_doc, from_page=page_idx, to_page=page_idx)

            out_doc.save(str(output_path), garbage=3, deflate=True)
        finally:
            out_doc.close()
            for doc in open_docs.values():
                doc.close()

        return str(output_path)

    def create_batch_zip(
        self,
        batch_name: str,
        candidate_pdf_paths: List[Tuple[str, str]], # [(roll_number, filepath), ...]
        zip_dir: Path
    ) -> Tuple[str, float, int]:
        """
        Creates a ZIP archive containing all candidate PDFs named {roll_number}.pdf.
        Returns (zip_path, size_in_mb, file_count).
        """
        clean_batch = "".join(c for c in batch_name if c.isalnum() or c in ("-", "_"))
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"HallTickets_{clean_batch}_{timestamp}.zip"
        zip_path = zip_dir / zip_filename

        with zipfile.ZipFile(str(zip_path), 'w', compression=zipfile.ZIP_DEFLATED) as zip_file:
            for roll, pdf_path in candidate_pdf_paths:
                if os.path.exists(pdf_path):
                    arcname = f"{roll}.pdf"
                    zip_file.write(pdf_path, arcname=arcname)

        size_bytes = os.path.getsize(str(zip_path))
        size_mb = round(size_bytes / (1024 * 1024), 2)
        count = len(candidate_pdf_paths)

        return str(zip_path), size_mb, count

pdf_engine = PDFEngine()
