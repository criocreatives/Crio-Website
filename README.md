# Crio Creatives website

Production static website for [criocreatives.com](https://criocreatives.com/), published from the **main** branch using GitHub Pages.

## Site map

- `/` — studio, services, featured work and contact form
- `/visual-atlas/` — Crio Creatives Visual Atlas
- `/tools/` — free browser tools and their individual pages
- `/privacy/` and `/terms/` — legal pages
- `/thanks/` — non-indexed form-confirmation page
- `/payment-details/` — non-indexed protected-content interface (not suitable for storing secrets in a public repository)

## SEO publishing checklist

1. Give each new public page a unique title, description, canonical URL, social metadata, and descriptive H1.
2. Add each indexable public URL to `sitemap.xml`; **exclude** private, confirmation and error pages.
3. Use meaningful image alt text; compress and resize images before committing. The homepage hero uses a high-priority preload, while gallery imagery loads lazily.
4. Use suitable structured data (Organization, CollectionPage or WebApplication) without asserting unverified business details.
5. Keep `robots.txt` discoverable and its sitemap URL correct; do not disallow pages that must be crawled to see their `noindex` directive.
6. Preserve the homepage layout and brand artwork. Check mobile navigation, tool functionality, and form submissions after modifications.
7. Run `python scripts/check_seo.py` before committing; the GitHub Actions workflow runs it automatically on changes.

## Deployment verification

After pushing, verify the live canonical host, `/robots.txt`, `/sitemap.xml`, social previews, Search Console coverage and PageSpeed Insights mobile/desktop. Source validation does not prove search indexing or Core Web Vitals performance.

## Privacy

The site uses FormSubmit for enquiries, LibreCounter for page analytics, and may load Google advertising code. Changes affecting tracking, cookies, or collection should be reviewed against `/privacy/`. A client-side PIN alone is not a substitute for server-side access control on sensitive information.
