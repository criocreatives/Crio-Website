#!/usr/bin/env python3
"""One-time lossless migration of Salisbury's 20 embedded WebP photographs."""
import re, json, base64, hashlib
from pathlib import Path
from html import unescape

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/"previews"/"9-salisbury-avenue"
SOURCE=SITE/"index.html"
DEST=ROOT/"previews"/"projects"/"9-salisbury-avenue.json"
def txt(s):
    return unescape(re.sub(r"<[^>]+>"," ",re.sub(r"<br\s*/?>"," ",str(s),flags=re.I))).strip()
def get(s,p):
    x=re.search(p,s,re.S|re.I)
    return x.group(1) if x else ""
def main():
    if DEST.exists():
        print("KEEP: 9-salisbury-avenue")
        return
    doc=SOURCE.read_text(encoding="utf-8")
    matches=list(re.finditer(r'<img\b[^>]*\bsrc="data:image/webp;base64,([A-Za-z0-9+/=]+)"[^>]*>',doc,re.I))
    if len(matches)!=20:
        raise RuntimeError(f"Salisbury image count mismatch: {len(matches)}")
    originals=[]
    for i,match in enumerate(matches,1):
        payload=base64.b64decode(match.group(1),validate=True)
        if payload[:4]!=b"RIFF" or payload[8:12]!=b"WEBP":
            raise RuntimeError(f"Invalid Salisbury image {i}")
        originals.append((f"./media/salisbury-{i:02d}.webp",payload))
    gallery=[]
    blocks=re.findall(r'<section\b[^>]*class="collection section"[^>]*>[\s\S]*?</section>',doc,re.I)
    if len(blocks)!=4:raise RuntimeError("Salisbury must retain four gallery collections")
    ordinal=1
    for block,id,groups in zip(blocks,("living","bedroom","details","balcony"),([1,2],[1,2,2,1],[3,2,2],[3])):
        if f'id="{id}"' not in block[:200]:
            raise RuntimeError("Unexpected Salisbury gallery section "+id)
        cards=re.findall(r'<figure\b[\s\S]*?</figure>',block,re.I)
        if len(cards)!=sum(groups):raise RuntimeError("Salisbury gallery grouping changed")
        items=[]
        for card in cards:
            alt=unescape(get(card,r'<img\b[^>]*alt="([^"]*)"'))
            caption=txt(get(card,r'<strong>([\s\S]*?)</strong>'))
            if not alt:raise RuntimeError("Image alt missing")
            items.append({"src":originals[ordinal][0],"alt":alt,"caption":caption})
            ordinal+=1
        section={"id":id,"kind":"gallery",
                 "label":txt(get(block,r'class="eyebrow"[^>]*>[\s\S]*?</span>([\s\S]*?)</div>')),
                 "title":txt(get(block,r'<h2>([\s\S]*?)</h2>')),
                 "paragraphs":[txt(get(block,r'class="section-heading-body"[^>]*>[\s\S]*?</h2>\s*<p>([\s\S]*?)</p>'))],
                 "images":items,"groups":groups}
        note=txt(get(block,r'<div\b[^>]*class="editorial-note"[^>]*>([\s\S]*?)</div>'))
        if note:section["note"]=note
        gallery.append(section)
    if ordinal!=20:raise RuntimeError("Salisbury gallery count != 19")
    overview=get(doc,r'<section\b[^>]*class="overview section"[^>]*>([\s\S]*?)</section>')
    ovbody=get(overview,r'<div\b[^>]*class="overview-body"[^>]*>([\s\S]*?)</div>')
    ov={"kind":"text","id":"overview","label":"PROJECT OVERVIEW",
        "title":txt(get(ovbody,r'<h2[^>]*>([\s\S]*?)</h2>')),
        "paragraphs":[txt(get(ovbody,r'</h2>\s*<p>([\s\S]*?)</p>'))],
        "items":[txt(x) for x in re.findall(r'<span>([^<]+)</span>',get(ovbody,r'class="overview-tags"[^>]*>([\s\S]*?)</div>'))]}
    m={"schema_version":2,"category":"arch-viz","slug":"9-salisbury-avenue",
       "title":"9 Salisbury Avenue","indexable":True,
       "seo":{"title":txt(get(doc,r'<title>([\s\S]*?)</title>')),
              "description":unescape(get(doc,r'<meta\b[^>]*name="description"[^>]*content="([^"]+)"'))},
       "hero":{"src":originals[0][0],"alt":unescape(get(matches[0].group(),r'\balt="([^"]+)"')),
               "eyebrow":"9 SALISBURY AVENUE / KINGSTON",
               "lines":["Living,","deliberately."],
               "description":"An interior design study for 9 Salisbury Avenue, Kingston — composed around natural light, refined materials and everyday function.",
               "focus":"center center"},
       "nav":[{"id":"overview","label":"OVERVIEW"},{"id":"living","label":"LIVING"},{"id":"bedroom","label":"BEDROOM"},{"id":"details","label":"DETAILS"}],
       "sections":[ov,*gallery],
       "closing":{"title":"Designed to be lived in.","discipline":"ARCHITECTURAL VISUALIZATION & INTERIOR DESIGN"}}
    if not m["seo"]["description"] or not ovbody:raise RuntimeError("Salisbury metadata missing")
    media=SITE/"media"
    media.mkdir(exist_ok=True)
    for name,payload in originals:
        target=SITE/name.removeprefix("./")
        if target.exists() and hashlib.sha256(target.read_bytes()).digest()!=hashlib.sha256(payload).digest():
            raise RuntimeError("Unexpected existing asset "+str(target))
        target.write_bytes(payload)
    DEST.write_text(json.dumps(m,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("IMPORTED: 9-salisbury-avenue, 20 losslessly extracted WebPs, 4 galleries")
if __name__=="__main__":main()
