#!/usr/bin/env python3
"""
Document OCR — extract raw text from a PDF or image file.
Input: file path (first arg) or {file_path} via stdin JSON
Output: raw text to stdout (or JSON with error)
"""
import sys
import json
import os
import subprocess


def extract_text(file_path):
    """
    Extract text from a PDF or image.
    Try pymupdf first (text PDFs), fall back to liteparse (scanned/images).
    Returns (text, engine_used, error).
    """
    if not os.path.exists(file_path):
        return "", "error", f"File not found: {file_path}"

    # Try pymupdf for text-based PDFs
    try:
        import pymupdf
        doc = pymupdf.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        if text.strip():
            return text, "pymupdf", None
    except Exception:
        pass

    # Try liteparse for scanned PDFs and images
    try:
        result = subprocess.run(
            ["lit", "parse", file_path, "--format", "markdown"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout, "liteparse", None
    except FileNotFoundError:
        pass
    except subprocess.TimeoutExpired:
        pass

    return "", "none", "No OCR engine could extract text from this file"


def main():
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        input_data = json.load(sys.stdin)
        file_path = input_data["file_path"]

    text, engine, error = extract_text(file_path)

    if error:
        print(json.dumps({"error": error, "file_path": file_path}, ensure_ascii=False))
        sys.exit(1)

    print(text)


if __name__ == "__main__":
    main()
