#!/usr/bin/env python3
"""Structural contract for manifest-generated Arch/Viz previews.

Checks the actual checked-in HTML, not a CSS approximation. No third-party modules.
"""
import json
import subprocess
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "previews" / "projects"

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title_count = self.h1_count = 0
        self.canonicals = []
        self.stylesheets = []
        self.sections = []
        self.gallery_sources = []
        self.gallery_alts = []
        self.anchors = []
        self.active_figure = False
        self.all_previews_footer = False
        self.footer = False
        self.logo_refs = 0
        self.has_viewer = False
        self.hero_image = None
        self.hero_contains_interactive = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.title_count += 1
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonicals.append(a.get("href"))
        elif tag == "link" and a.get("rel") == "stylesheet":
            self.stylesheets.append(a.get("href"))
        elif tag == "section" and "av-section" in a.get("class", "").split():
            self.sections.append(a.get("id"))
        elif tag == "figure" and "av-shot" in a.get("class", "").split():
            self.active_figure = True
        elif tag == "img":
            if a.get("class") == "av-hero-image":
                self.hero_image = a.get("src")
            if self.active_figure:
                self.gallery_sources.append(a.get("src"))
                self.gallery_alts.append(a.get("alt"))
            if "Crio Creatives" == a.get("alt"):
                self.logo_refs += 1
        elif tag == "a":
            self.anchors.append(a.get("href"))
            if self.footer and a.get("href") == "/previews/":
                self.all_previews_footer = True
            if self.hero_image and a.get("href") == self.hero_image:
                self.hero_contains_interactive = True
        elif tag == "footer":
            self.footer = True
        elif tag == "dialog" and a.get("id") == "av-dialog":
            self.has_viewer = True

    def handle_endtag(self, tag):
        if tag == "figure":
            self.active_figure = False
        if tag == "footer":
            self.footer = False


def main():
    subprocess.run(["node", str(ROOT / "scripts/build_previews.mjs"), "--check"], cwd=ROOT, check=True)
    paths = sorted(PROJECTS.glob("*.json"))
    assert paths, "No managed preview manifests"
    for path in paths:
        m = json.loads(path.read_text(encoding="utf-8"))
        assert m["schema_version"] == 2 and m["category"] == "arch-viz"
        html = (ROOT / "previews" / m["slug"] / "index.html").read_text(encoding="utf-8")
        page = Page()
        page.feed(html)
        sources = [im["src"] for s in m["sections"] for im in s.get("images", [])]
        assert page.title_count == page.h1_count == 1, path
        assert page.canonicals == [f"https://criocreatives.com/previews/{m['slug']}/"], path
        assert page.gallery_sources == sources, f"Gallery source order changed: {path}"
        assert len(page.gallery_alts) == len(sources) and all(page.gallery_alts), path
        assert page.sections == [s["id"] for s in m["sections"]], path
        assert len(page.stylesheets) == 3 and page.stylesheets[0] == "/assets/css/site-header.css?v=3" and page.stylesheets[1].startswith("/previews/assets/css/arch-viz.css") and page.stylesheets[2] == "/style.css?v=4", path
        assert 'id="site-header"' in html and 'id="site-nav"' in html, path
        assert 'src="/assets/js/site-header.js?v=1"' in html and 'src="/assets/js/site.js?v=4"' in html, f"Shared header or site controller missing: {path}"
        assert html.count('id="site-header"') == 1 and html.count('id="site-nav"') == 1, path
        assert page.anchors.count("/previews/") == 1 and not page.all_previews_footer, path
        assert page.has_viewer and page.logo_refs == 1, path
        assert not page.hero_contains_interactive, f"Hero image is linked to a viewer: {path}"
        assert "arch-viz-standard.css" not in html
        assert "presentation-editorial.css" not in html
        assert "crio-project-theme.css" not in html
        assert "<style>" not in html
        assert 'VIEW FULL IMAGE' not in html
        for section in m["sections"]:
            for image in section.get("images", []):
                if image.get("caption"):
                    assert image["caption"] in unescape(html), f"Gallery caption missing: {path}: {image['src']}"
        print(f"PASS {m['slug']}: {len(sources)} gallery images, {len(page.sections)} sections")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
