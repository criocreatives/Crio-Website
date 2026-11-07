#!/usr/bin/env python3
"""Render the shared Crio header into static pages from one template + page slots."""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "scripts/site-header-pages.json"
TEMPLATE = ROOT / "scripts/templates/site-header.html.tmpl"
START = "<!-- CRIO-HEADER:START -->"
END = "<!-- CRIO-HEADER:END -->"
CSS_HREF = "/assets/css/site-header.css?v=2"
SCRIPT_SRC = "/assets/js/site-header.js?v=1"


def esc(value: str) -> str:
    return html.escape(str(value), quote=True)


def render(template: str, config: dict) -> str:
    links = []
    for item in config.get("links", []):
        cls = f' class="{esc(item["class"])}"' if item.get("class") else ""
        current = ' aria-current="page"' if item.get("current") else ""
        links.append(f'<a href="{esc(item["href"])}"{cls}{current}>{esc(item["label"])}</a>')
    context = config.get("context", "")
    context_html = f'<span class="header-context">{esc(context)}</span>' if context else ""
    menu = ('<button class="menu-toggle" type="button" aria-controls="site-nav" '
            'aria-expanded="false">MENU</button>') if links else ""
    nav = "".join(links)
    nav_html = (f'<nav class="nav" id="site-nav" aria-label="{esc(config.get("navLabel", "Primary navigation"))}">{nav}</nav>') if links else ""
    values = {
        "HOME_HREF": esc(config.get("homeHref", "/")),
        "CONTEXT": context_html,
        "MENU": menu,
        "NAV_LABEL": esc(config.get("navLabel", "Primary navigation")),
        "NAV_LINKS": nav,
    }
    # NAV and its accessible label are rendered together so empty navigation omits both controls.
    rendered = template.replace("[[HOME_HREF]]", values["HOME_HREF"])
    rendered = rendered.replace("[[CONTEXT]]", values["CONTEXT"])
    rendered = rendered.replace("[[MENU]]", values["MENU"])
    rendered = re.sub(r'<nav class="nav" id="site-nav" aria-label="\[\[NAV_LABEL\]\]">\[\[NAV_LINKS\]\]</nav>', nav_html, rendered)
    if "[[" in rendered:
        raise ValueError("Unrendered shared-header token")
    return rendered.strip()


def ensure_assets(page: str) -> str:
    page = re.sub(r'(?:\sdata-site-header)+', ' data-site-header', page)
    page = re.sub(r'(src=["\'])/?assets/js/site\.js\?v=\d+', r'\1/assets/js/site.js?v=4', page, flags=re.I)
    page = re.sub(r'<script\b[^>]*src=["\'][^"\']*/plugins/site\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*', '', page, flags=re.I)
    head_end = re.search(r"</head\s*>", page, re.I)
    if not head_end:
        raise ValueError("Configured page is missing </head>")
    head = page[:head_end.start()]
    tail = page[head_end.start():]
    css_tag = f'<link rel="stylesheet" href="{CSS_HREF}" data-site-header>'
    css_pattern = re.compile(r'<link\b(?=[^>]*href=["\'][^"\']*/assets/css/site-header\.css(?:\?[^"\']*)?["\'])[^>]*>', re.I)
    head = css_pattern.sub("", head)
    script_tag = f'<script defer src="{SCRIPT_SRC}" data-crio-site-header></script>'
    script_pattern = re.compile(r'<script\b(?=[^>]*src=["\']' + re.escape(SCRIPT_SRC) + r'["\'])[^>]*>\s*</script>', re.I)
    head = script_pattern.sub("", head)
    # Place the one shared CSS and controller after page styles, before parsing the body.
    head = head.rstrip() + "\n" + css_tag + "\n" + script_tag + "\n"
    page = head + tail
    return page


def replace_header(page: str, config: dict, rendered: str, path: str) -> str:
    block = rendered.strip()
    if START in page or END in page:
        first = page.find(START)
        last = page.rfind(END)
        if first < 0 or last < first:
            raise ValueError(f"{path}: malformed shared header markers")
        page = page[:first] + block + page[last + len(END):]
        if page.count(START) != 1 or page.count(END) != 1:
            raise ValueError(f"{path}: multiple shared header blocks")
        return page
    if config.get("placement") == "body":
        match = re.search(r"<body\b[^>]*>", page, re.I)
        if not match:
            raise ValueError(f"{path}: missing body for shared header")
        return page[:match.end()] + "\n" + block + page[match.end():]
    old = re.search(r"<header\b[^>]*>[\s\S]*?</header\s*>", page, re.I)
    if not old:
        raise ValueError(f"{path}: no header found; declare placement=body")
    return page[:old.start()] + block + page[old.end():]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if generated headers are stale")
    parser.add_argument("--page", help="render a single configured page")
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    template = TEMPLATE.read_text(encoding="utf-8")
    names = [args.page] if args.page else sorted(config)
    failures = 0
    for name in names:
        if name not in config:
            print(f"UNKNOWN: {name}", file=sys.stderr)
            failures += 1
            continue
        path = ROOT / name
        original = path.read_text(encoding="utf-8")
        output = ensure_assets(replace_header(original, config[name], render(template, config[name]), name))
        if output != original:
            if args.check:
                print(f"STALE: {name}")
                failures += 1
            else:
                path.write_text(output, encoding="utf-8")
                print(f"BUILT: {name}")
        else:
            print(f"OK: {name}")
        if output.count('id="site-header"') != 1:
            print(f"INVALID: {name} must contain one site header", file=sys.stderr)
            failures += 1
        if "site-header.js" not in output or "site-header.css" not in output:
            print(f"INVALID: {name} missing shared header assets", file=sys.stderr)
            failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
