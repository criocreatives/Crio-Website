#!/usr/bin/env python3
"""Legacy command-line entrypoint for the single Arch/Viz manifest compiler."""
import subprocess,sys
from pathlib import Path
raise SystemExit(subprocess.call(["node",str(Path(__file__).with_name("build_previews.mjs")),*sys.argv[1:]]))
