#!/usr/bin/env python3
"""
Document Interpretation — classify + extract fields + summarize.
Input: raw text (stdin or --file)
Output: JSON {document_type, fields, summary} to stdout

Note: The actual LLM calls are done by the agent (Hermes) using its model.
This script provides the structure and prompts. When called by the agent,
it formats the text and returns the prompts to use.
"""
import sys
import json


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--file":
        with open(sys.argv[2], 'r', encoding='utf-8') as f:
            raw_text = f.read()
    else:
        raw_text = sys.stdin.read()

    if not raw_text.strip():
        print(json.dumps({"error": "No text provided"}))
        sys.exit(1)

    result = {
        "raw_text": raw_text,
        "text_length": len(raw_text),
        "instruction": "Use the field schemas in references/field-schemas.md to classify and extract",
        "status": "ready_for_interpretation"
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
