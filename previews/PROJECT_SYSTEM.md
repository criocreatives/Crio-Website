# Crio project previews

All ten architectural visualization previews use the shared manifest renderer,
header, hero, responsive gallery styles, and gallery image viewer. Salisbury
Avenue and Tiny Living remain the visual references. The hero image is static;
only gallery images open in the fullscreen viewer.

## Sources and generated pages

- `previews/projects/<slug>.json` stores SEO metadata, hero details, section
  navigation, project copy, gallery order, captions, and image paths.
- Original media stays under each project's `images/` or `renders/` directory.
- `scripts/templates/crio-project.html.tmpl` supplies the shared HTML structure.
- `assets/js/site.js` owns the shared sticky, scroll-morphing header and menu;
  Arch/Viz pages use its controller instead of adding a second header handler.
- `previews/assets/css/arch-viz.css` and `previews/assets/js/arch-viz.js`
  supply the shared responsive design and gallery viewer. Header labels are
  uppercase, section copy is left-aligned, and gallery images have a viewport
  height limit while retaining their original aspect ratio.
- `scripts/build_previews.py` invokes the deterministic manifest renderer.
- `previews/<slug>/index.html` is generated output. Edit the manifest, then
  regenerate the page; manual changes to generated HTML will be overwritten.

To add or update a project, edit its manifest and place original images in its
project directory. Keep image filenames, resolution, order, and intentional
groupings. Use verified descriptions, captions, credits, and metadata. Use an
empty hero source when no approved image exists; do not invent one.

Run:

```bash
python3 scripts/build_previews.py
python3 scripts/build_previews.py --check
python3 scripts/test_crio_preview_structure.py
python3 scripts/test_crio_preview_browser.cjs
python3 scripts/check_seo.py
```

The separate legacy-gallery builder skips projects with manifests in
`previews/projects/`, so it cannot overwrite generated Arch/Viz pages. Keep
Graphic Design, Web Design, and Events pages in their existing systems.

The shared header contains the sole “All Previews” link. Do not add project
recommendations or previous/next project links. Existing project URLs remain
`/previews/<slug>/`.
