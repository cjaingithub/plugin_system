#!/usr/bin/env python3
"""
Flowchart CLI Entry Point

Allows running the flowchart module as:
    python -m flowchart parse <file>
    python -m flowchart validate <file>
    python -m flowchart generate <file> --project-dir <path>
"""

import sys
from .cli import main

if __name__ == "__main__":
    sys.exit(main())
