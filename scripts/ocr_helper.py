#!/usr/bin/env python3
"""OCR helper — runs in venv where easyocr/pymupdf are installed.
Usage: python ocr_helper.py <image_or_pdf_path> [--pdf-page 0]
Outputs JSON: {"text": "...", "blocks": [...]}
"""
import json, sys
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: ocr_helper.py <path>"}))
        return 1
    
    input_path = sys.argv[1]
    pdf_page = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    
    try:
        # Convert PDF to image if needed
        ocr_target = input_path
        temp_img = None
        
        if input_path.lower().endswith('.pdf'):
            try:
                import pymupdf
            except ImportError:
                import fitz as pymupdf
            doc = pymupdf.open(input_path)
            page = doc[min(pdf_page, len(doc)-1)]
            pix = page.get_pixmap(dpi=200)
            temp_img = str(Path(input_path).with_suffix('.ocr_tmp.png'))
            pix.save(temp_img)
            doc.close()
            ocr_target = temp_img
        
        # Run easyocr
        import easyocr
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(ocr_target)
        
        text = " ".join([r[1] for r in results])
        blocks = [{"text": r[1], "confidence": float(r[2]), "bbox": [[int(c) for c in pt] for pt in r[0]]} for r in results]
        
        # Cleanup temp image
        if temp_img:
            try:
                Path(temp_img).unlink()
            except OSError:
                pass
        
        print(json.dumps({"text": text, "blocks": blocks}))
        return 0
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return 1

if __name__ == "__main__":
    sys.exit(main())
