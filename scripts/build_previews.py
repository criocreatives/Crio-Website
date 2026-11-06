#!/usr/bin/env python3
"""Build Crio project presentations from manifests, without redesigning the pages.

Usage:
  python3 scripts/build_previews.py                      # build all manifests
  python3 scripts/build_previews.py --project tiny-living
  python3 scripts/build_previews.py --check             # fail on stale outputs

Original images stay exactly where they are. No image compression or copying.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "previews"
MANIFEST_DIR = PREVIEWS / "projects"
TEMPLATE = ROOT / "scripts" / "templates" / "crio-project.html.tmpl"
BASE_URL = "https://criocreatives.com/previews/"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ASPECT = re.compile(r"^[1-9]\d{0,4}/[1-9]\d{0,4}$")
TOKEN = re.compile(r"\[\[([A-Z_]+)\]\]")

def esc(value):
    return html.escape(str(value), quote=True)

def require(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label}: expected nonempty text")
    return value

def pair(value, label):
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError(f"{label}: expected [first line, second line]")
    return [require(line, label) for line in value]

def valid_ratio(value, label):
    if not isinstance(value, str) or not ASPECT.fullmatch(value):
        raise ValueError(f"{label}: expected a ratio such as 4/3 or 3/4")
    return value

def safe_image(project_dir: Path, value, label):
    """Image references must point to existing files inside this project."""
    raw = require(value, label)
    posix = Path(raw)
    if posix.is_absolute() or "\\" in raw or "?" in raw or "#" in raw or ":" in raw:
        raise ValueError(f"{label}: use a relative repository image filename")
    if any(p in ("..", ".") for p in posix.parts) or not posix.suffix.lower() in (
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"
    ):
        raise ValueError(f"{label}: unsafe or unsupported image path {raw}")
    resolved = (project_dir / posix).resolve()
    if not resolved.is_relative_to(project_dir.resolve()) or not resolved.is_file():
        raise ValueError(f"{label}: image missing from repository: {raw}")
    return posix.as_posix()

def image_href(image):
    return "./" + quote(image, safe="/-_.~")

def text_or_default(entry, key, default):
    return require(entry.get(key, default), key)

def figure(image, section, ordinal, index, total, default_ratio, project_dir, wide):
    if isinstance(image, str):
        image = {"file": image}
    if not isinstance(image, dict):
        raise ValueError(f"Gallery entry {index + 1}: expected filename or object")
    src = safe_image(project_dir, image.get("file"), f"gallery image {index + 1}")
    label = f"{section['label']} — view {ordinal:02d}"
    caption = esc(text_or_default(image, "caption", label))
    alt = esc(text_or_default(image, "alt", label))
    ratio = valid_ratio(image.get("aspect", default_ratio), f"{src} aspect")
    return (
        f'<figure class="shot{" wide-image" if wide else ""}" data-index="{index}" '
        f'tabindex="0" role="button" aria-label="Open full-screen image: {alt}" '
        f'style="--project-image-ratio:{ratio}">\n'
        f' <img src="{image_href(src)}" alt="{alt}" loading="lazy" decoding="async">\n'
        f' <figcaption class="shot-caption"><span><em>{index+1:02d} / {total:02d}</em>'
        f'<strong>{caption}</strong></span><span class="shot-open" aria-hidden="true">VIEW</span></figcaption>\n'
        "</figure>"
    )

def render_collection(section, section_num, index, total, project_dir, default_ratio):
    section_id = require(section.get("id"), "section id")
    if not SLUG.fullmatch(section_id):
        raise ValueError(f"Invalid section id {section_id}")
    label = esc(require(section.get("label"), f"{section_id} label"))
    line1, line2 = [esc(s) for s in pair(section.get("heading"), f"{section_id} heading")]
    copy = esc(require(section.get("description"), f"{section_id} description"))
    items = section.get("images")
    if not isinstance(items, list) or not items:
        raise ValueError(f"{section_id}: gallery must contain at least one image")

    rendered = [
        figure(item, section, i + 1, index + i, total, default_ratio, project_dir, False)
        for i, item in enumerate(items)
    ]
    cards = []
    if len(rendered) == 2:
        cards.append('<div class="gallery-pair">\n' + "\n".join(rendered) + "\n</div>")
    else:
        # Lead with one Salisbury-style feature image; arrange the rest as pairs.
        # The last unpaired image spans the width without cropping its aspect ratio.
        cards.append(rendered[0].replace('class="shot"', 'class="shot wide-image"', 1))
        for start in range(1, len(rendered), 2):
            if start + 1 < len(rendered):
                cards.append('<div class="gallery-pair">\n' + rendered[start] + "\n" +
                             rendered[start + 1] + "\n</div>")
            else:
                cards.append(rendered[start].replace('class="shot"', 'class="shot wide-image"', 1))

    markup = (
        f'<section class="collection section" id="{section_id}" aria-labelledby="{section_id}-heading">\n'
        f' <div class="section-heading"><div class="eyebrow"><span class="red-line"></span>'
        f'{section_num:02d} / {label}</div><div class="section-heading-body">'
        f'<h2 id="{section_id}-heading">{line1} <i>{line2}</i></h2>'
        f'<p>{copy}</p></div></div>\n'
        f' <div class="gallery">\n' + "\n".join(cards) + "\n </div>\n</section>"
    )
    return markup, len(items)

def build(manifest_path: Path):
    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    if m.get("schema_version") != 1:
        raise ValueError(f"{manifest_path}: unsupported schema version")
    slug = require(m.get("slug"), "slug")
    if not SLUG.fullmatch(slug) or manifest_path.stem != slug:
        raise ValueError("manifest filename must match a safe project slug")
    project_dir = PREVIEWS / slug
    if not project_dir.is_dir():
        raise ValueError(f"Project directory missing: {project_dir}")
    if not isinstance(m.get("indexable"), bool):
        raise ValueError("Set indexable explicitly to true or false")
    seo = m["seo"]
    title = require(seo["title"], "SEO title")
    description = require(seo["description"], "SEO description")
    if not 40 <= len(description) <= 220:
        raise ValueError("SEO description length should be 40–220 characters")
    share = text_or_default(seo, "share_description", description)
    hero = m["hero"]
    overview = m["overview"]
    end = m["closing"]
    galleries = m["gallery"]["sections"]
    if not isinstance(galleries, list) or not galleries:
        raise ValueError("gallery.sections must contain sections")
    default_ratio = valid_ratio(m["gallery"].get("default_aspect", "4/3"), "default aspect")
    sections_ids = [require(s["id"], "section id") for s in galleries]
    if any(not SLUG.fullmatch(s) for s in sections_ids) or len(set(sections_ids)) != len(sections_ids):
        raise ValueError("Section ids must be distinct safe slugs")
    total = sum(len(s["images"]) for s in galleries)
    if total == 0:
        raise ValueError("No gallery images")
    hero_file = safe_image(project_dir, hero.get("image"), "hero image")
    canonical = BASE_URL + slug + "/"
    absolute_image = canonical + quote(hero_file, safe="/-_.~")
    page_title = esc(title)
    hero_line1, hero_line2 = [esc(s) for s in pair(hero.get("headline"), "hero headline")]
    ov_line1, ov_line2 = [esc(s) for s in pair(overview.get("headline"), "overview headline")]
    end_line1, end_line2 = [esc(s) for s in pair(end.get("headline"), "closing headline")]
    intro_tags = overview.get("tags", [])
    if not isinstance(intro_tags, list):
        raise ValueError("overview.tags must be a list")
    tags = "".join(f"<span>{esc(require(tag,'tag'))}</span>" for tag in intro_tags)

    nav = m.get("navigation")
    if nav is None:
        nav = [{"section": k, "label": k.upper()} for k in sections_ids[:4]]
    if not isinstance(nav, list) or len(nav) > 4:
        raise ValueError("Navigation accepts no more than four links")
    nav_fragments = []
    for item in nav:
        dest = item["section"]
        if dest not in sections_ids:
            raise ValueError(f"Navigation references missing section: {dest}")
        nav_fragments.append(f'<a href="#{dest}">{esc(require(item["label"],"navigation label"))}</a>')

    sections, running = [], 0
    for number, section in enumerate(galleries, 1):
        markup, n = render_collection(section, number, running, total, project_dir, default_ratio)
        sections.append(markup)
        running += n

    hero_html = f'''<section class="hero" aria-labelledby="hero-heading">
 <img class="hero-image" src="{image_href(hero_file)}" fetchpriority="high" decoding="async" alt="{esc(require(hero['alt'],'hero alt'))}">
 <div class="hero-content"><div class="hero-eyebrow"><span class="red-line"></span>{esc(require(hero['eyebrow'],'hero eyebrow'))}</div>
 <h1 id="hero-heading">{hero_line1}<br><em>{hero_line2}</em></h1>
 <div class="hero-meta"><p>{esc(require(hero['description'],'hero description'))}</p>
 <div class="hero-index">{esc(require(hero['index_label'],'hero index'))}<span>{total:02d} IMAGES / {len(galleries):02d} COLLECTIONS</span>
 <button class="hero-open" id="hero-open" type="button">VIEW FULL IMAGE</button></div></div></div>
 <a href="#overview" class="scroll-cue">EXPLORE THE PROJECT</a>
</section>'''
    overview_html = f'''<section class="overview section" id="overview" aria-labelledby="overview-heading">
 <div class="overview-index"><span class="eyebrow"><span class="red-line"></span>{esc(require(overview["eyebrow"],"overview eyebrow"))}</span>
 <p>{esc(require(overview["index_label"],"overview index"))}<br>01 — {len(galleries):02d}</p></div>
 <div class="overview-body"><h2 id="overview-heading">{ov_line1}<br><span class="muted-heading">{ov_line2}</span></h2>
 <p>{esc(require(overview["description"],"overview description"))}</p>
 <div class="overview-tags">{tags}</div></div>
</section>'''
    ending_html = f'''<section class="end-section" aria-labelledby="end-title">
 <div class="end-wrap"><p class="end-eyebrow">{esc(require(end["eyebrow"],"closing eyebrow"))}</p>
 <h2 id="end-title">{end_line1}<br><span>{end_line2}</span></h2>
 <div class="end-divider"><span class="footer-brand"><img class="footer-logo-real"
 src="https://criocreatives.com/assets/logos/Crio%20Creatives%20Logo%20wide%20white.svg"
 alt="Crio Creatives" width="152" height="44"></span>
 <span>{esc(require(end["discipline"],"discipline"))}</span>
 <button class="back-top" id="back-top" type="button">BACK TO TOP</button></div></div>
</section>'''
    replacements = {
        "PAGE_TITLE": page_title, "DESCRIPTION": esc(description),
        "ROBOTS": "" if m["indexable"] else '<meta name="robots" content="noindex,follow">',
        "OG_TITLE": page_title, "OG_DESCRIPTION": esc(share),
        "CANONICAL": esc(canonical),
        "OG_IMAGE": esc(absolute_image),
        "OG_IMAGE_ALT": esc(require(hero["alt"],"hero alt")),
        "HERO_IMAGE": esc(image_href(hero_file)),
        "NAVIGATION": "".join(nav_fragments),
        "HERO": hero_html, "OVERVIEW": overview_html,
        "COLLECTIONS": "\n".join(sections),
        "ENDING": ending_html, "IMAGE_COUNTER": f"01 / {total:02d}",
    }
    template = TEMPLATE.read_text(encoding="utf-8")
    unknown = set(TOKEN.findall(template)) - set(replacements)
    if unknown:
        raise ValueError(f"Unknown template placeholders: {sorted(unknown)}")
    html_text = TOKEN.sub(lambda match: replacements[match.group(1)], template)
    return project_dir / "index.html", html_text, total

def reconcile_sitemap(manifest_paths, check=False):
    """Update only manifest-managed URLs, leaving all other sitemap entries intact."""
    sitemap_file = ROOT / "sitemap.xml"
    original = sitemap_file.read_text(encoding="utf-8")
    result = original
    if "</urlset>" not in result:
        raise ValueError("Malformed sitemap: closing urlset not found")
    for path in manifest_paths:
        m = json.loads(path.read_text(encoding="utf-8"))
        slug = m["slug"]
        url = BASE_URL + slug + "/"
        # Existing sitemap deliberately uses a compact one-line URL entry.
        entry = f"  <url><loc>{url}</loc></url>"
        count = result.count(f"<loc>{url}</loc>")
        if count > 1:
            raise ValueError(f"Duplicate sitemap entry for {url}")
        if m["indexable"] and not count:
            result = result.replace("</urlset>", entry + "\n</urlset>")
        elif not m["indexable"] and count:
            result = re.sub(
                r"(?m)^ *<url><loc>" + re.escape(url) + r"</loc></url>\n?",
                "", result
            )
            if f"<loc>{url}</loc>" in result:
                raise ValueError(f"Cannot remove nonstandard sitemap entry for {url}")
    if check and result != original:
        print("STALE: sitemap.xml (managed preview URLs)", file=sys.stderr)
        return False
    if not check and result != original:
        sitemap_file.write_text(result, encoding="utf-8")
        print("BUILT: sitemap.xml (managed preview URLs)")
    return True

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", help="Generate one project by slug")
    parser.add_argument("--check", action="store_true", help="Validate that output matches source")
    args = parser.parse_args()
    paths = ([MANIFEST_DIR / f"{args.project}.json"] if args.project
             else sorted(MANIFEST_DIR.glob("*.json")))
    if not paths:
        parser.error("No manifests found")
    failed = False
    for path in paths:
        if not path.is_file():
            raise SystemExit(f"Project manifest missing: {path}")
        dest, output, total = build(path)
        previous = dest.read_text(encoding="utf-8") if dest.exists() else ""
        if args.check and previous != output:
            print(f"STALE: {dest.relative_to(ROOT)} ({total} images)", file=sys.stderr)
            failed = True
        elif previous != output:
            dest.write_text(output, encoding="utf-8")
            print(f"BUILT: {dest.relative_to(ROOT)} ({total} images)")
        else:
            print(f"OK: {dest.relative_to(ROOT)} ({total} images)")
    if not reconcile_sitemap(paths, check=args.check):
        failed = True
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
