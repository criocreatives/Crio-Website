#!/usr/bin/env python3
"""Check Visual Atlas content, taxonomy, poster sources, and brief safeguards."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "visual-atlas/index.html"


def read_array(source: str, name: str) -> list[dict]:
    match = re.search(rf"const {name}=(\[.*?\]);\n", source, re.S)
    assert match, f"Missing {name} data"
    return json.loads(match.group(1))


def main() -> None:
    source = PAGE.read_text(encoding="utf-8")
    styles = read_array(source, "styles")
    posters = read_array(source, "posterStyles")
    assert len(styles) == 30 and len(posters) == 20

    for label, entries in (("design directions", styles), ("poster studies", posters)):
        descriptions = [entry["description"].strip() for entry in entries]
        assert all(descriptions), f"An entry has no description in {label}"
        assert len(set(descriptions)) == len(entries), f"Repeated descriptions in {label}"
        assert all(entry["best"].strip() for entry in entries)
        assert all(len(entry["traits"]) >= 3 for entry in entries)
        assert all(entry["prompt"].strip() for entry in entries)

    poster_sources = re.findall(
        r'<img src="(/assets/images/visual-atlas/posters/[^\"]+\.webp)"',
        source,
    )
    assert len(set(poster_sources)) == 20, "Poster image source is reused"
    assert len(poster_sources) == 20, f"Expected 20 raster poster images, found {len(poster_sources)}"
    for asset in poster_sources:
        path = ROOT / asset.lstrip("/")
        assert path.is_file(), f"Missing poster artwork: {asset}"
        data = path.read_bytes()
        assert data[:4] == b"RIFF" and data[8:12] == b"WEBP", f"Not a raster WebP: {asset}"

    assert "REQUIRED COPY: [paste exact approved wording; do not invent extra text]" in source
    assert "PRODUCTION LIMITS:" in source
    assert "AUDIENCE:" in source and "FORMAT:" in source and "ASSETS:" in source
    assert "Do not add fake logos, dates, event details, or claims." in source
    assert not re.search(r"visual-atlas/posters/[^\"]+\.jpg", source)
    assert "vector poster" not in source.lower()
    assert len(re.findall(r'<article class="style-card poster-card"', source)) == 20
    assert len(re.findall(r'<article class="style-card"', source)) == 30
    print("Visual Atlas content and raster poster checks passed (30 directions, 20 studies).")


if __name__ == "__main__":
    main()
