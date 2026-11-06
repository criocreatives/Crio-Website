#!/usr/bin/env python3
"""Regression checks for layout-preserving Crio gallery manifests."""
import json
import tempfile
from pathlib import Path

from build_legacy_galleries import DATA, ROOT, build

def main():
    entries=list(sorted(DATA.glob("*.json")))
    assert entries, "No gallery manifests"
    for p in entries:
        manifest=json.loads(p.read_text(encoding="utf-8"))
        target,generated,count=build(p)
        assert target.read_text(encoding="utf-8")==generated, f"Unexpected HTML changes: {p}"
        assert count==sum(len(group["images"]) for group in manifest["galleries"])
        assert "<html" in generated and "</html>" in generated
        assert 'presentation-init.js' in generated
        assert '<meta' in generated
        assert 'id="lightbox"' in generated
        srcs=[item["file"] if isinstance(item,dict) else item for g in manifest["galleries"] for item in g["images"]]
        assert len(srcs)==count
        for src in srcs:
            assert src in generated, f"Missing rendered image reference: {src}"
        print(f"PASS: {manifest['slug']}, {count} original image cards, identical HTML")

    manning=DATA/"mannings-hill-road-apartment-complex.json"
    m=json.loads(manning.read_text(encoding="utf-8"))
    repeats=[x for group in m["galleries"] for x in group["images"] if x["file"]=="images/Image3.jpg"]
    assert len(repeats)==2 and repeats[0]["card"]!=repeats[1]["card"], "Duplicated views were collapsed"

    # Simulate adding a new image by referencing an existing image file not
    # present in the Boscobel gallery; no source HTML edits are allowed.
    b=json.loads((DATA/"boscobel-heights-residence.json").read_text(encoding="utf-8"))
    new={"file":"images/Image21.png","alt":"Boscobel Heights front elevation","caption":"Front elevation"}
    b["galleries"][0]["images"].append(new)
    with tempfile.TemporaryDirectory() as folder:
        tmp=Path(folder)/"boscobel-heights-residence.json"
        tmp.write_text(json.dumps(b),encoding="utf-8")
        _dest,preview,n=build(tmp)
    assert n==12 and preview.count("Front elevation")>=1
    assert 'href="images/Image21.png"' in preview
    print("PASS: new source-image references can generate cards without editing HTML")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
