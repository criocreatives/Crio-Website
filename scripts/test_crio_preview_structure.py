#!/usr/bin/env python3
"""Structural checks for the current standardized Crio preview contract."""
import json
from html.parser import HTMLParser
from pathlib import Path
from build_previews import MANIFEST_DIR, build, ROOT

class ImagesAndSections(HTMLParser):
    def __init__(self):
        super().__init__()
        self.figure_indices = []
        self.figure_sources = []
        self.sections = []
        self.canonical = []
        self.hero = []
        self.stylesheets = []
        self.h1_count = 0
        self.title_count = 0

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "figure" and "shot" in d.get("class", "").split():
            self.figure_indices.append(int(d["data-index"]))
        if tag == "section" and "collection" in d.get("class","").split():
            self.sections.append(d["id"])
        if tag == "img" and d.get("src","").startswith("./"):
            self.figure_sources.append(d["src"])
        if tag == "img" and d.get("class") == "hero-image":
            self.hero.append(d["src"])
        if tag == "link" and d.get("rel") == "canonical":
            self.canonical.append(d.get("href"))
        if tag == "link" and d.get("rel") == "stylesheet":
            self.stylesheets.append(d.get("href"))
        if tag == "h1":
            self.h1_count += 1
        if tag == "title":
            self.title_count += 1

def main():
    for path in sorted(MANIFEST_DIR.glob("*.json")):
        m = json.loads(path.read_text(encoding="utf-8"))
        out, source, total = build(path)
        assert source == out.read_text(encoding="utf-8"), f"Stale generated page: {out}"
        page = ImagesAndSections()
        page.feed(source)
        assert page.figure_indices == list(range(total)), f"{path}: gallery order is broken"
        assert len(page.figure_sources) == total + 1, f"{path}: gallery count plus hero"
        assert len(page.hero) == 1
        assert page.sections == [s["id"] for s in m["gallery"]["sections"]]
        assert page.canonical == [f"https://criocreatives.com/previews/{m['slug']}/"]
        assert page.title_count == page.h1_count == 1
        assert len(page.stylesheets) == 3
        assert "crio-project-base.css?v=1" in page.stylesheets[0]
        assert "presentation-editorial.css?v=2" in page.stylesheets[1]
        assert "crio-project-theme.css?v=1" in page.stylesheets[2]
        assert 'class="crio-project"' in source
        assert 'crio-project-gallery.js?v=1' in source
        assert '<style>' not in source, f"{path}: inline page stylesheet regression"
        assert "data-index=\"30\"" in source if m["slug"] == "tiny-living" else True
        print(f"PASS: {m['slug']}, {len(page.sections)} collections, {total} images")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
