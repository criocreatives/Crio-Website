#!/usr/bin/env python3
"""Copy Crio Previews into the main website without deleting the source."""
from pathlib import Path
import re
import shutil

WORKSPACE = Path(__file__).resolve().parents[2]
SITE = WORKSPACE / 'main-site'
SOURCE = WORKSPACE / 'source-previews'
DEST = SITE / 'previews'
OLD = 'https://previews.criocreatives.com'
NEW = 'https://criocreatives.com/previews'
EXCLUDED = {'.git', '.github', 'CNAME', 'README.md'}
TEXT = {'.html', '.css', '.js', '.xml', '.txt', '.json'}

assert (SITE / 'CNAME').is_file(), 'Main website checkout missing'
assert (SOURCE / 'list/index.html').is_file(), 'Source previews checkout missing'
assert not DEST.exists(), 'Target previews directory already exists; abort rather than overwrite'
shutil.copytree(SOURCE, DEST, ignore=lambda directory, names: [n for n in names if n in EXCLUDED])

attributes = re.compile(r'(?P<pre>\b(?:href|src|action|poster|data-src|data-href)=\s*["\'])/(?P<tail>(?!/)[^"\']*)', re.IGNORECASE)
css_urls = re.compile(r'(?P<pre>url\(\s*["\']?)/(?!/)', re.IGNORECASE)
for path in DEST.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in TEXT:
        continue
    data = path.read_text(encoding='utf-8')
    original = data
    if path == DEST / 'assets/js/presentation-init.js':
        data = data.replace(
            "window.location.hostname === 'previews.criocreatives.com'",
            "window.location.hostname === 'criocreatives.com' && window.location.pathname.startsWith('/previews/')"
        )
        data = data.replace(
            "const slug = location.pathname.split('/').filter(Boolean)[0] || 'index';",
            "const slug = location.pathname.replace(/^\\/previews(?:\\/|$)/, '/').split('/').filter(Boolean)[0] || 'index';"
        )
    if path == DEST / '404.html':
        data = data.replace(
            "location.hostname === 'previews.criocreatives.com'",
            "location.hostname === 'criocreatives.com' && location.pathname.startsWith('/previews/')"
        )
    data = data.replace(OLD, NEW).replace('http://previews.criocreatives.com', NEW)
    data = attributes.sub(lambda m: m.group('pre') + '/previews/' + m.group('tail'), data)
    data = css_urls.sub(lambda m: m.group('pre') + '/previews/', data)

    if path == DEST / 'list/index.html':
        data = data.replace(
            'https://api.github.com/repos/criocreatives/crio-previews/git/trees/main?recursive=1',
            'https://api.github.com/repos/criocreatives/Crio-Website/git/trees/main?recursive=1'
        )
        data = data.replace(
            r'/^([a-z0-9][a-z0-9_-]*)\/index\.html$/i.exec(item.path)',
            r'/^previews\/([a-z0-9][a-z0-9_-]*)\/index\.html$/i.exec(item.path)'
        )
        data = data.replace("link.href='/'+encodeURIComponent(p.slug)+'/';", "link.href='/previews/'+encodeURIComponent(p.slug)+'/';")
        data = data.replace("['row-url','/'+p.slug+'/']", "['row-url','/previews/'+p.slug+'/']")
        data = re.sub(r'(<span class="row-url">)/(?!previews/)', r'\1previews/', data)
        assert "link.href='/previews/'+encodeURIComponent(p.slug)+'/';" in data
        assert r'/^previews\/([a-z0-9][a-z0-9_-]*)\/index\.html$/i.exec(item.path)' in data
    if data != original:
        path.write_text(data, encoding='utf-8')

for path in SITE.rglob('*.html'):
    if DEST in path.parents:
        continue
    data = path.read_text(encoding='utf-8')
    if OLD in data or 'http://previews.criocreatives.com' in data:
        path.write_text(data.replace(OLD, NEW).replace('http://previews.criocreatives.com', NEW), encoding='utf-8')

sitemap = SITE / 'sitemap.xml'
sm = sitemap.read_text(encoding='utf-8')
urls = ['/previews/', '/previews/list/']
for item in SOURCE.iterdir():
    if item.is_dir() and (item / 'index.html').is_file() and item.name not in {'list', 'portfolio'}:
        urls.append('/previews/' + item.name + '/')
assert len(urls) == 16, f'Expected 14 project pages plus landing and list; found {len(urls)}'
new_lines = '\n'.join('  <url><loc>https://criocreatives.com' + location + '</loc></url>' for location in sorted(urls))
assert '</urlset>' in sm, 'Unexpected sitemap'
sitemap.write_text(sm.replace('</urlset>', new_lines + '\n</urlset>'), encoding='utf-8')

source_files = [p for p in SOURCE.rglob('*') if p.is_file() and not any(part in EXCLUDED for part in p.relative_to(SOURCE).parts)]
assert all((DEST / p.relative_to(SOURCE)).is_file() for p in source_files)
for path in source_files:
    if path.suffix.lower() not in TEXT:
        assert path.read_bytes() == (DEST / path.relative_to(SOURCE)).read_bytes(), f'Media changed: {path}'
print(f'Migrated {len(source_files)} source files and {len(urls)-2} project pages.')
print('Cloudflare permanent wildcard redirect is a separate deployment step after live validation.')
