#!/usr/bin/env python3
"""Prevent the old /previews/list/ split landing page from returning."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "previews"
ROOT_URL = "https://criocreatives.com/previews/"
OLD_URL = ROOT_URL + "list/"

class Inspect(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.canonical = []
        self.search = False
        self.rows = []
        self.noindex = False
    def handle_starttag(self,tag,attrs):
        d = dict(attrs)
        if tag == "link" and d.get("rel") == "canonical":
            self.canonical.append(d.get("href"))
        if tag == "input" and d.get("id") == "preview-search":
            self.search = d.get("type") == "search"
        if tag == "a" and d.get("href","").startswith("/previews/"):
            self.links.append(d["href"])
        if tag == "meta" and d.get("name") == "robots":
            self.noindex = "noindex" in d.get("content","")
        if tag == "meta" and d.get("http-equiv") == "refresh":
            self.rows.append(d.get("content", ""))

def main():
    root = (PREVIEWS / "index.html").read_text(encoding="utf-8")
    old = (PREVIEWS / "list/index.html").read_text(encoding="utf-8")
    nav = (PREVIEWS / "assets/js/presentation-init.js").read_text(encoding="utf-8")
    styles = (PREVIEWS / "assets/css/preview-directory.css").read_text(encoding="utf-8")
    fresh = Inspect()
    stale = Inspect()
    fresh.feed(root)
    stale.feed(old)
    assert fresh.canonical == [ROOT_URL], f"Directory canonical incorrect: {fresh.canonical}"
    assert not fresh.noindex, "New primary directory should remain indexable"
    assert fresh.search and 'id="preview-groups"' in root, "Searchable grouped preview list missing"
    assert "grid-template-columns:repeat(2,minmax(0,1fr))" in styles, "Desktop two-column layout missing"
    assert "/previews/assets/css/preview-directory.css?v=1" in root, "Directory stylesheet missing"
    assert "Browse the archive" not in root and "All previews" not in root, "Removed archive labels returned"
    assert "CRIO / PREVIEWS" not in root and "Internal directory" not in root, "Internal directory labels returned"
    for heading in ("Architecture &amp; Interior Design", "Graphic Design &amp; Branding", "Web Design", "Music &amp; Artist Promotion"):
        assert heading in root, f"Preview category missing: {heading}"
    assert root.count('<section class="preview-group"') == 4, "Static directory groups are incomplete"
    assert "Internal directory compact view" not in root, "Superseded directory CSS override returned"
    assert "presentation-init.js" not in root and "presentation-editorial.css" not in root, "Project presentation chrome should not load on the directory"
    assert "presentation-init.js" not in root and "presentation-editorial.css" not in root, "Project presentation chrome should not load on the directory"
    assert "api.github.com/repos/criocreatives/Crio-Website/git/trees/main?recursive=1" in root
    assert "const excluded=new Set(['list','portfolio'])" in root
    assert stale.canonical == [ROOT_URL] and stale.noindex, "Legacy redirect needs canonical + noindex"
    assert any("url="+ROOT_URL in x for x in stale.rows), "Meta redirect missing"
    assert "location.replace('/previews/' + location.search + location.hash)" in old, "JS redirect missing"
    assert "/previews/list/" not in nav, "Preview navigation still links to obsolete directory"
    assert "crio-ed-bar" not in nav and "createElement('header')" not in nav, "Preview script must not inject a competing header"
    assert "crio-ed-rule" in nav, "Project presentation label strip should remain"
    assert 'id="site-header"' in root and 'src="/assets/js/site-header.js?v=1"' in root
    assert 'href="/previews/"' not in root.split('id="site-header"', 1)[1].split('</header>', 1)[0], "Directory header must not link to itself"

    expected = {
        d.name for d in PREVIEWS.iterdir()
        if d.is_dir() and (d / "index.html").is_file()
        and d.name not in {"list", "portfolio"}
    }
    saved = set(re.findall(r'<li class="preview-row"><a href="/previews/([^/]+)/"', root))
    assert saved == expected, f"Offline project snapshot mismatch: missing={expected-saved}, extra={saved-expected}"
    counts = re.findall(r'<span class="row-num">(\d{2})</span>', root)
    assert counts == [f"{i:02d}" for i in range(1,len(expected)+1)], "Unordered snapshot numbering"
    xml = ET.parse(ROOT / "sitemap.xml")
    urls = [n.text for n in xml.findall(".//{*}loc")]
    assert urls.count(ROOT_URL) == 1 and OLD_URL not in urls, "Old list or duplicate root in sitemap"

    # Any remaining old directory links in published source must be fixed, not
    # silently left relying on the compatibility redirect.
    stale_links = []
    for suffix in (".html",".js",".css"):
        for path in ROOT.rglob("*"+suffix):
            if path == PREVIEWS / "list/index.html":
                continue
            source = path.read_text(encoding="utf-8")
            if "/previews/list/" in source:
                stale_links.append(str(path.relative_to(ROOT)))
    assert not stale_links, f"Outdated /previews/list/ links: {stale_links}"
    print(f"PASS: /previews/ is the single searchable directory, {len(expected)} projects, legacy redirect and sitemap verified.")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"PREVIEW DIRECTORY CHECK FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
