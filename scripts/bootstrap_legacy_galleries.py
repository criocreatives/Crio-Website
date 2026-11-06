#!/usr/bin/env python3
"""One-time extraction of gallery media from existing Crio preview presentations.

Preserves all approved HTML and styles byte-for-byte. Original index.html stays
the comparison baseline; the derived template and gallery data are stored aside.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "previews"
TEMPLATES = ROOT / "scripts/templates/legacy-gallery"
DATA = PREVIEWS / "gallery-manifests"
FIGURE = re.compile(r"<figure\b[^>]*\bclass=[\"'](?=[^\"']*\bshot\b)[^\"']+[\"'][^>]*>.*?</figure>", re.S)
GALLERY = re.compile(r'<div\b[^>]*class="gallery(?: [^"]*)?"[^>]*>', re.I)
IMG = re.compile(r'<img\b[^>]*\bsrc="([^"]+)"', re.S)
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")

def export(slug: str):
    if not SLUG.fullmatch(slug):
        raise ValueError(f"Invalid project slug: {slug}")
    dest = PREVIEWS / slug / "index.html"
    source = dest.read_text(encoding="utf-8")
    galleries = list(GALLERY.finditer(source))
    if not galleries:
        raise ValueError(f"No compatible galleries found in {slug}")
    changes = []
    inventory = []
    html_data = {"schema_version": 1, "slug": slug, "galleries": {}}
    for number, m in enumerate(galleries, 1):
        close = source.find("</div>", m.end())
        if close == -1:
            raise ValueError(f"Unclosed gallery in {slug}")
        body = source[m.end():close]
        figures = list(FIGURE.finditer(body))
        if not figures:
            raise ValueError(f"Unexpected gallery without figure.shot in {slug}")
        # Reject nested divs: the first closing div must belong to the gallery.
        if "<div" in body.lower() or "</div" in body.lower():
            raise ValueError(f"Nested div in gallery of {slug}: review manually")
        slot = f"gallery_{number:02d}"
        entries = []
        snippets = {}
        seen_images = {}
        for i, fig in enumerate(figures):
            actual = IMG.search(fig.group())
            if not actual:
                raise ValueError(f"Figure missing image source {slot} #{i}")
            image = actual.group(1)
            seen_images[image] = seen_images.get(image, 0) + 1
            # Keep the original markup distinct even when a source image is
            # intentionally presented more than once in the gallery.
            key = image if seen_images[image] == 1 else f"{image}::view-{seen_images[image]}"
            # Retain each original figure, including its trailing whitespace.
            part = body[fig.start():figures[i+1].start() if i+1<len(figures) else len(body)]
            snippets[key] = part
            entries.append({"file": image, "card": key})
        preamble = body[:figures[0].start()]
        inventory.append({"slot": slot, "images": entries})
        html_data["galleries"][slot] = {"preamble": preamble, "cards": snippets}
        changes.append((m.end(),close,preamble+f"[[{slot.upper()}]]"))
    template = source
    for start,end,replacement in reversed(changes):
        template = template[:start] + replacement + template[end:]
    TEMPLATES.mkdir(parents=True,exist_ok=True)
    DATA.mkdir(parents=True,exist_ok=True)
    template_file = TEMPLATES / f"{slug}.html.tmpl"
    card_file = TEMPLATES / f"{slug}.cards.json"
    manifest_file = DATA / f"{slug}.json"
    for file in (template_file,card_file,manifest_file):
        if file.exists():
            raise FileExistsError(f"Refusing to overwrite existing source: {file}")
    manifest = {"schema_version":1,"slug":slug,"mode":"preserve-layout",
                "template":f"scripts/templates/legacy-gallery/{slug}.html.tmpl",
                "card_library":f"scripts/templates/legacy-gallery/{slug}.cards.json",
                "galleries":inventory}
    template_file.write_text(template,encoding="utf-8")
    card_file.write_text(json.dumps(html_data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    manifest_file.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    # Exact-output contract catches accidental whitespace or component changes.
    from build_legacy_galleries import build
    target,compiled,total=build(manifest_file)
    if target!=dest or compiled!=source:
        raise AssertionError(f"{slug}: generated page differs from original HTML")
    print(f"EXTRACTED {slug}: {len(galleries)} galleries, {total} image references, byte-identical output")

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slugs",nargs="+",required=True)
    args=parser.parse_args()
    for slug in args.slugs:
        export(slug)

if __name__=="__main__":
    main()
