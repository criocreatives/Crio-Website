# Crio project previews

The established Crio editorial presentation format is standardized without redesigning existing projects or modifying the original images. This is the architecture-gallery template, not a compulsory layout for unrelated projects (e.g., interactive website demos, EPKs, or client-specific visual presentations).

## Where things live

| Path | Role |
| --- | --- |
| `previews/projects/<slug>.json` | Project metadata, hero, copy, gallery order and images |
| `previews/<slug>/renders/` or `images/` | Original image files, unchanged |
| `scripts/templates/crio-project.html.tmpl` | Shared page structure |
| `previews/assets/css/crio-project-base.css` | Approved Crio editorial geometry and typography |
| `previews/assets/css/crio-project-theme.css` | Shared off-white theme and native-ratio galleries |
| `previews/assets/css/presentation-editorial.css` | Site-wide presentation integration, unchanged |
| `previews/assets/js/crio-project-gallery.js` | Full-screen gallery with keyboard navigation |
| `previews/assets/js/presentation-init.js` | Existing Crio floating header, analytics and footer |
| `scripts/build_previews.py` | Validated deterministic renderer |
| `previews/<slug>/index.html` | Generated static HTML delivered by GitHub Pages |

## New project workflow

1. Create `previews/<new-slug>/` and add the original images in a subfolder. Do **not** rename, re-encode or crop existing image files.
2. Copy `previews/projects/tiny-living.json` to `previews/projects/<new-slug>.json`. Edit the slug, SEO title and description, hero, overview, closing text, section descriptions and filenames.
3. Arrange the `gallery.sections` array in the desired section order. Arrange each section's `images` list in the exact gallery order. Each item can be a filename (e.g. `"renders/Image1.webp"`) or an object, for example:
   ```json
   {"file":"renders/Exterior-03.webp","alt":"Street-facing facade in afternoon light","caption":"Facade / afternoon","aspect":"16/9"}
   ```
4. Set `indexable` **explicitly**: `false` for pages not intended for search indexing, `true` only when public indexing is approved. The builder automatically adds or removes the project's sitemap entry without changing legacy entries. **Noindex is not access control**: anyone with the URL can still open the page, and the public preview directory may link to it. Do not upload confidential client material without authorization.
5. Run `python3 scripts/build_previews.py --project <new-slug>`. The renderer validates every referenced image and synchronizes the project's sitemap entry.
6. Run `python3 scripts/build_previews.py --check` and `python3 scripts/test_crio_preview_structure.py`. Open the generated page at desktop and mobile widths.

**No HTML editing is required for normal project content, image replacement or gallery reordering.** The generated `index.html` is an output, not the source of truth; modifying it manually will be overwritten at the next regeneration.

The GitHub workflow builds and validates changed manifests on branch pushes, then commits updated static pages into that branch. It also checks the same content on pull requests. The public preview URL retains the established structure: `https://criocreatives.com/previews/<slug>/`.

## Template capabilities

- The established Crio photographic masthead, editorial overview and typography
- The familiar numbered gallery sections, pairs, feature images and image viewer
- Automatically calculated image counters and collection counts
- Exact source filenames; optional per-image alt text, caption and aspect ratio
- Original assets remain in place; no resizing or recompression
- Shared site navigation, GA4 and existing Crio footer
- Client previews can opt out of search indexing; existing public project URLs do not change
- Both single-image and multi-image galleries work without special HTML

## Safeguards and migration scope

**Tiny Living** is the initial managed example. Other existing previews have not been rewritten or visually standardized in this change, because several are unique client presentations. The shared template can be adopted project-by-project, after visual comparison and approval.

All existing published previews remain where they are. Do not run a mass conversion or delete legacy source pages in order to enable the new workflow. `previews/9-salisbury-avenue/` remains a visual reference. New pages reuse Crio styling without copying byLYNCH's public design.

To change styling across *managed* galleries, edit the shared CSS rather than every project page. Do not modify the original architectural renders or their filenames.
