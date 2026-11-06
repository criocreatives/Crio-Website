#!/usr/bin/env python3
"""Render approved legacy Crio galleries from ordered media manifests.

This is a *layout-preserving* complement to build_previews.py. It only replaces
gallery slots in each project's original HTML template. Established styling,
copy, headers, caption markup, JavaScript and media assets remain untouched.

Existing images use their exact original figure HTML. New media files can be
added by putting a file path, alt and optional caption in the manifest; those
receive the same .shot/.lightbox-link markup as neighboring cards.

  python3 scripts/build_legacy_galleries.py
  python3 scripts/build_legacy_galleries.py --project boscobel-heights-residence
  python3 scripts/build_legacy_galleries.py --check
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
DATA = ROOT / "previews/gallery-manifests"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FILE_EXTS = {".jpg",".jpeg",".png",".webp",".gif",".avif"}
TOKEN = re.compile(r"\[\[(GALLERY_\d\d)\]\]",re.I)
ZOOM = re.compile(r'<span class="zoom"[^>]*>[\s\S]*?</span>')

def valid_file(slug, name):
    if not isinstance(name,str) or not name:
        raise ValueError("Gallery image needs a nonempty file path")
    p = Path(name)
    if (p.is_absolute() or "\\" in name or "://" in name or
        "?" in name or "#" in name or any(part in {"..","."} for part in p.parts) or
        p.suffix.lower() not in FILE_EXTS):
        raise ValueError(f"{slug}: invalid image path: {name}")
    source_dir = ROOT / "previews" / slug
    target = (source_dir / p).resolve()
    if not target.is_relative_to(source_dir.resolve()) or not target.is_file():
        raise ValueError(f"{slug}: missing original image: {name}")
    return name

def new_card(item,slot,index,original):
    if not isinstance(item,dict):
        raise ValueError(f"{slot}: new image requires an alt text and optional caption")
    name=item["file"]
    alt=item.get("alt","").strip()
    if not alt:
        raise ValueError(f"{slot}: new media {name} requires descriptive alt text")
    caption=item.get("caption",f"View {index+1:02d}")
    if not isinstance(caption,str):
        raise ValueError("caption must be text")
    wide=bool(item.get("wide",False))
    src=quote(name,safe="/-_.~")
    zoom_match=ZOOM.search(original)
    zoom=zoom_match.group() if zoom_match else '<span class="zoom" aria-hidden="true">View</span>'
    return (
        f'<figure class="shot{" wide" if wide else ""}">\n'
        f' <a href="{html.escape(src,quote=True)}" class="lightbox-link" '
        f'aria-label="Open {html.escape(alt,quote=True)}">\n'
        f'  <img src="{html.escape(src,quote=True)}" '
        f'alt="{html.escape(alt,quote=True)}" loading="lazy" decoding="async">\n'
        f'  {zoom}\n'
        f' </a>\n'
        f' <figcaption><span>{html.escape(caption)}</span></figcaption>\n'
        f'</figure>\n'
    )

def build(manifest_path):
    m=json.loads(manifest_path.read_text(encoding="utf-8"))
    slug=m.get("slug")
    if (m.get("schema_version")!=1 or m.get("mode")!="preserve-layout"
        or not isinstance(slug,str) or not SLUG.fullmatch(slug) or manifest_path.stem!=slug):
        raise ValueError(f"{manifest_path}: invalid schema or slug")
    source_tpl=Path(m["template"])
    source_cards=Path(m["card_library"])
    expected=Path(f"scripts/templates/legacy-gallery/{slug}.html.tmpl")
    if source_tpl!=expected or source_cards!=expected.with_suffix("").with_suffix(".cards.json"):
        # Exact prescribed paths; cannot use manifests to open arbitrary files.
        raise ValueError(f"{slug}: unsupported template or card-library path")
    cards=json.loads((ROOT/source_cards).read_text(encoding="utf-8"))
    template=(ROOT/source_tpl).read_text(encoding="utf-8")
    if cards.get("slug")!=slug or cards.get("schema_version")!=1:
        raise ValueError(f"{slug}: inconsistent original card library")
    galleries=m["galleries"]
    if not isinstance(galleries,list) or not galleries:
        raise ValueError(f"{slug}: no galleries")
    replacements={}
    used_files=[]
    for section in galleries:
        slot=section.get("slot")
        if not isinstance(slot,str) or not re.fullmatch("gallery_\d{2}",slot):
            raise ValueError(f"{slug}: invalid gallery slot {slot}")
        key=slot.upper()
        if key in replacements or template.count(f"[[{key}]]")!=1:
            raise ValueError(f"{slug}: duplicate or missing {key}")
        original=cards["galleries"][slot]["cards"]
        files=section.get("images")
        if not isinstance(files,list) or not files:
            raise ValueError(f"{slug}/{slot}: no images")
        pieces=[]
        for index,item in enumerate(files):
            name=valid_file(slug,item if isinstance(item,str) else item["file"])
            used_files.append(name)
            part=original.get(name)
            if part is None:
                part=new_card(item,slot,index,next(iter(original.values())))
            pieces.append(part)
        replacements[key]="".join(pieces)
    required=set(TOKEN.findall(template))
    if required!=set(replacements):
        raise ValueError(f"{slug}: unresolved gallery placeholders: {required^set(replacements)}")
    result=TOKEN.sub(lambda m:replacements[m.group(1)],template)
    if "[[GALLERY_" in result:
        raise ValueError(f"{slug}: unresolved template slot")
    return ROOT/"previews"/slug/"index.html",result,len(used_files)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project")
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()
    paths=[DATA / f"{args.project}.json"] if args.project else sorted(DATA.glob("*.json"))
    if not paths:
        parser.error("No legacy gallery manifests found")
    stale=False
    for path in paths:
        if not path.is_file():
            raise SystemExit(f"Missing gallery manifest {path}")
        dest,markup,count=build(path)
        current=dest.read_text(encoding="utf-8") if dest.exists() else ""
        if args.check:
            if markup!=current:
                print(f"STALE: {dest.relative_to(ROOT)}",file=sys.stderr)
                stale=True
            else:
                print(f"PASS: {dest.relative_to(ROOT)} ({count} images, exact source output)")
        elif markup!=current:
            dest.write_text(markup,encoding="utf-8")
            print(f"BUILT: {dest.relative_to(ROOT)} ({count} images)")
        else:
            print(f"UNCHANGED: {dest.relative_to(ROOT)} ({count} images)")
    return int(stale)

if __name__=="__main__":
    sys.exit(main())
