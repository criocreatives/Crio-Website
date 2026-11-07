#!/usr/bin/env python3
"""Verify every Crio shell page uses the shared, generated header component."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "scripts/site-header-pages.json").read_text(encoding="utf-8"))
START = "<!-- CRIO-HEADER:START -->"
END = "<!-- CRIO-HEADER:END -->"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.headers = 0
        self.navs = 0
        self.nav_links = []
        self.header_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "header" and attrs.get("id") == "site-header":
            self.headers += 1
            self.header_depth += 1
        elif tag == "nav" and attrs.get("id") == "site-nav":
            self.navs += 1
        elif tag == "a" and self.header_depth:
            self.nav_links.append(attrs.get("href", ""))

    def handle_endtag(self, tag):
        if tag == "header" and self.header_depth:
            self.header_depth -= 1


def main():
    pages = set(CONFIG)
    pages.update(f"previews/{p.stem}/index.html" for p in (ROOT / "previews/projects").glob("*.json"))
    for name in sorted(pages):
        path = ROOT / name
        source = path.read_text(encoding="utf-8")
        page = Page()
        page.feed(source)
        assert source.count(START) == source.count(END) == 1, f"{name}: expected one generated header block"
        assert page.headers == 1, f"{name}: expected exactly one site header"
        config = CONFIG.get(name)
        assert page.navs == (1 if not config or config.get("links") else 0), f"{name}: unexpected navigation slot count"
        assert source.count("/assets/css/site-header.css?v=2") == 1, f"{name}: shared header CSS must load once"
        assert len(re.findall(r'/assets/css/site-header\.css(?:\?[^"\']*)?["\']', source)) == 1, f"{name}: old or duplicate shared header CSS remains"
        assert source.count("data-crio-site-header") == 1, f"{name}: shared header controller must load once"
        assert not re.search(r'<script\b[^>]*src=["\']https?://[^"\']*/assets/js/site\.js', source, re.I), f"{name}: page must not load an external competing site controller"
        assert "crio-shell-header" not in source and "crio-ed-bar" not in source, f"{name}: legacy header remains"
        if config:
            for link in config.get("links", []):
                href = link["href"]
                if href.startswith("#"):
                    assert href[1:] in page.ids, f"{name}: broken local header link {href}"
        print(f"PASS {name}: shared header, {len(page.nav_links)} nav links")

    for name in ["style.css", "assets/css/crio-subpage.css", "plugins/style.css", "tools/tools.css"]:
        source = (ROOT / name).read_text(encoding="utf-8")
        assert not re.search(r"\.site-header\b|\.crio-shell-header\b|\.menu-toggle\b|\.crio-ed-bar\b", source), f"{name}: competing header styles remain"
    presentation = (ROOT / "previews/assets/css/presentation-editorial.css").read_text(encoding="utf-8")
    assert ".crio-ed-bar" not in presentation
    init = (ROOT / "previews/assets/js/presentation-init.js").read_text(encoding="utf-8")
    assert "createElement('header')" not in init and "--morph-top" not in init
    assert not (ROOT / "plugins/site.js").exists(), "Plugin-specific header controller was not removed"
    print("PASS one header style/controller; legacy injectors and overrides removed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
