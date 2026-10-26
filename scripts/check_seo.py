#!/usr/bin/env python3
"""Validate indexable Crio Creatives static pages without third-party dependencies."""
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://criocreatives.com"
EXCLUDED = {"404.html", "thanks/index.html", "payment-details/index.html"}
STRUCTURED = {"index.html", "tools/index.html", "visual-atlas/index.html",
              "tools/converter/index.html", "tools/compressor/index.html",
              "tools/resizer/index.html", "tools/watermarker/index.html",
              "tools/qr/index.html"}

class Inspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.in_title = False
        self.meta = {}
        self.links = {}
        self.headings = []
        self.images_missing_alt = 0
        self.jsonld = []
        self.in_jsonld = False
        self.jsonld_buffer = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.meta.setdefault(key.lower(), []).append(a.get("content", ""))
        elif tag == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.links.setdefault("canonical", []).append(a.get("href", ""))
        elif tag == "h1":
            self.headings.append("h1")
        elif tag == "img" and "alt" not in a:
            self.images_missing_alt += 1
        elif tag == "script" and a.get("type") == "application/ld+json":
            self.in_jsonld = True
            self.jsonld_buffer = ""

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_jsonld:
            self.jsonld_buffer += data

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "script" and self.in_jsonld:
            self.jsonld.append(self.jsonld_buffer)
            self.in_jsonld = False

def report_failure(messages, path, message):
    messages.append(f"{path}: {message}")

def page_url(rel):
    if rel == "index.html":
        return BASE + "/"
    return BASE + "/" + rel.removesuffix("index.html")

def main():
    failures = []
    expected_urls = set()
    for file in sorted(ROOT.rglob("*.html")):
        rel = file.relative_to(ROOT).as_posix()
        # Imported client presentations have their own distinct legacy metadata
        # and analytics conventions. Include public pages in sitemap accounting
        # without applying the main marketing pages\u0027 strict metadata template.
        if rel.startswith("previews/"):
            if rel not in {"previews/404.html", "previews/portfolio/index.html"}:
                expected_urls.add(page_url(rel))
            continue
        source = file.read_text(encoding="utf-8")
        page = Inspector()
        page.feed(source)
        if 'referrerpolicy="unsafe-url"' in source:
            report_failure(failures, rel, "unsafe referrer policy")
        if page.images_missing_alt:
            report_failure(failures, rel, f"{page.images_missing_alt} image(s) lack alt attributes")
        if rel in EXCLUDED:
            if not any("noindex" in x for x in page.meta.get("robots", [])):
                report_failure(failures, rel, "excluded page missing noindex")
            continue
        url = page_url(rel)
        expected_urls.add(url)
        if not page.title.strip():
            report_failure(failures, rel, "missing page title")
        if not any(40 <= len(x) <= 175 for x in page.meta.get("description", [])):
            report_failure(failures, rel, "missing or unsuitable meta description")
        if page.links.get("canonical") != [url]:
            report_failure(failures, rel, "canonical URL is absent, duplicated, or wrong")
        if len(page.headings) != 1:
            report_failure(failures, rel, f"expected one H1, found {len(page.headings)}")
        for k in ("og:title", "og:description", "og:url", "og:image", "twitter:card"):
            if len(page.meta.get(k, [])) != 1:
                report_failure(failures, rel, f"missing or duplicate {k}")
        if page.meta.get("og:url") != [url]:
            report_failure(failures, rel, "Open Graph URL differs from canonical")
        if rel in STRUCTURED:
            if not page.jsonld:
                report_failure(failures, rel, "missing JSON-LD")
            for block in page.jsonld:
                try:
                    json.loads(block)
                except json.JSONDecodeError as exc:
                    report_failure(failures, rel, f"invalid JSON-LD: {exc}")

    tree = ET.parse(ROOT / "sitemap.xml")
    sitemap = {el.text for el in tree.findall(".//{*}loc") if el.text}
    if sitemap != expected_urls:
        failures.append(f"sitemap mismatch: missing={sorted(expected_urls - sitemap)}, extra={sorted(sitemap - expected_urls)}")
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if f"Sitemap: {BASE}/sitemap.xml" not in robots:
        failures.append("robots.txt: sitemap declaration missing")

    if failures:
        print("SEO VALIDATION FAILED")
        for item in failures:
            print(" -", item)
        return 1
    print(f"SEO validation passed: {len(expected_urls)} indexable pages, {len(EXCLUDED)} excluded pages.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
