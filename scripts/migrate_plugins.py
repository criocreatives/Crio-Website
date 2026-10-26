#!/usr/bin/env python3
"""Lossless one-time Crio Plugins migration into main GitHub Pages site."""
from pathlib import Path
import re
import shutil

WORKSPACE = Path(__file__).resolve().parents[2]
SITE = WORKSPACE / "main-site"
SOURCE = WORKSPACE / "source-plugins"
DEST = SITE / "plugins"

OLD = "https://plugins.criocreatives.com"
NEW = "https://criocreatives.com/plugins"
EXCLUDE = {".git", ".github", "CNAME", ".nojekyll", "robots.txt", "sitemap.xml"}
TEXT_TYPES = {".html", ".css", ".js", ".json", ".xml", ".txt"}
CANONICAL_PAGES = {
    "": "Crio Plugins — SketchUp Workflow Extensions",
    "rail-fence-tool": "Rail & Fence Tool",
    "3d-pattern-builder": "3D Pattern Builder",
    "stage-truss-builder": "Stage & Truss Builder",
}
REDIRECT_ALIASES = {"fence-maker", "floor-tile-tool", "stage-builder"}
BUY = "https://buy.stripe.com/3cI5kEahl6Mp1k14q2aVa0h"
DOWNLOAD = "https://crio-rail-license.criocreatives.workers.dev/downloads"

assert (SITE / "CNAME").is_file(), "Main site checkout not found"
assert (SOURCE / "rail-fence-tool/index.html").is_file(), "Plugin source checkout not found"
assert not DEST.exists(), "Target /plugins/ exists; abort instead of overwriting"
source_rail = (SOURCE / "rail-fence-tool/index.html").read_text(encoding="utf-8")
assert BUY in source_rail and DOWNLOAD in source_rail, "Checkout or fulfillment links unexpectedly changed"

shutil.copytree(SOURCE, DEST, ignore=lambda directory, names: [n for n in names if n in EXCLUDE])
attrs = re.compile(r'(?P<pre>\b(?:href|src|action|poster|data-src|data-href)=\s*["\'])/(?!/)', re.I)
css_url = re.compile(r'(?P<pre>url\(\s*["\']?)/(?!/)', re.I)
location = re.compile(r'(?P<pre>\b(?:window\.)?location\.(?:replace|assign)\(\s*["\'])/(?!/)', re.I)
meta_refresh = re.compile(r'(?P<pre>;\s*url\s*=\s*)/(?!/)', re.I)

for path in sorted(DEST.rglob("*")):
    if not path.is_file() or path.suffix.lower() not in TEXT_TYPES:
        continue
    raw = path.read_text(encoding="utf-8")
    result = raw.replace(OLD, NEW).replace("http://plugins.criocreatives.com", NEW)
    result = attrs.sub(lambda m: m.group("pre") + "/plugins/", result)
    result = css_url.sub(lambda m: m.group("pre") + "/plugins/", result)
    result = location.sub(lambda m: m.group("pre") + "/plugins/", result)
    result = meta_refresh.sub(lambda m: m.group("pre") + "/plugins/", result)
    if path == DEST / "index.html":
        meta = (
            '<link rel="canonical" href="https://criocreatives.com/plugins/">\n'
            '<meta property="og:url" content="https://criocreatives.com/plugins/">\n'
            '<meta property="og:title" content="Crio Plugins — SketchUp Workflow Extensions">\n'
            '<meta property="og:description" content="Purpose-built SketchUp extensions for modeling, architecture and event design from Crio Creatives.">\n'
        )
        assert '<link rel="canonical"' not in result
        assert '<title>' in result
        result = result.replace('<title>', meta + '<title>', 1)
    if result != raw:
        path.write_text(result, encoding="utf-8")

for p in SITE.rglob("*"):
    if not p.is_file() or DEST in p.parents:
        continue
    if p.suffix.lower() not in {".html", ".css", ".js", ".xml"}:
        continue
    original = p.read_text(encoding="utf-8")
    rewritten = original.replace(OLD, NEW).replace("http://plugins.criocreatives.com", NEW)
    if rewritten != original:
        p.write_text(rewritten, encoding="utf-8")

sitemap_path = SITE / "sitemap.xml"
sitemap = sitemap_path.read_text(encoding="utf-8")
assert "</urlset>" in sitemap
urls = ["https://criocreatives.com/plugins/" + (slug + "/" if slug else "") for slug in CANONICAL_PAGES]
assert all(url not in sitemap for url in urls), "Plugin URL already in sitemap"
new_entries = "\n".join(f"  <url><loc>{url}</loc></url>" for url in urls)
sitemap_path.write_text(sitemap.replace("</urlset>", new_entries + "\n</urlset>"), encoding="utf-8")

# Validate link rewriting, canonical URLs, and preserved checkout endpoints.
for slug in CANONICAL_PAGES:
    page = DEST / slug / "index.html" if slug else DEST / "index.html"
    data = page.read_text(encoding="utf-8")
    url = NEW + ("/" + slug if slug else "") + "/"
    assert f'<link rel="canonical" href="{url}">' in data, f"Wrong canonical: {page}"
    assert '<h1' in data, f"Missing product heading: {page}"
    assert not re.search(r'(?:href|src)=["\']/(?!plugins/|/)', data), f"Unmigrated local asset link: {page}"
assert BUY in (DEST / "rail-fence-tool/index.html").read_text(encoding="utf-8")
assert DOWNLOAD in (DEST / "rail-fence-tool/index.html").read_text(encoding="utf-8")
for slug in REDIRECT_ALIASES:
    path = DEST / slug / "index.html"
    data = path.read_text(encoding="utf-8")
    assert "noindex" in data and "location.replace('/plugins/" in data, f"Bad alias: {slug}"

source_files = [p for p in SOURCE.rglob("*") if p.is_file() and not any(s in EXCLUDE for s in p.relative_to(SOURCE).parts)]
assert all((DEST / p.relative_to(SOURCE)).is_file() for p in source_files)
for p in source_files:
    if p.suffix.lower() not in TEXT_TYPES:
        assert p.read_bytes() == (DEST / p.relative_to(SOURCE)).read_bytes(), f"Changed binary asset: {p}"
assert len([p for p in DEST.rglob("index.html")]) == 7
print(f"Migrated {len(source_files)} source files: four public pages, three legacy redirects, seven original product images.")
print("Checkout and licensing endpoints unchanged. Activate old-domain Cloudflare 301 redirects only after live QA.")
