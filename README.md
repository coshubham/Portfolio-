# Shubham Kumar Yadav - portfolio

Live: https://coshubham.github.io/Portfolio-/

Python + LLM engineer. I add RAG chat, semantic search and voice search to apps that are already live, and I keep them running in production. This site is the landing page for my freelance work.

## What is in it

- `index.html` - the whole site, one page (generated from checked content; edit it directly if you only need to change words)
- `404.html` - not-found page for GitHub Pages (uses absolute `/Portfolio-/` paths on purpose)
- `css/` - `base` (tokens), `layout`, `components`, `animations`, `extras`, `motion`
- `js/` - `main` (nav, reveal, counters, tilt, form), `extras` (query walkthrough, FAQ, magnetic buttons), `motion` (intro, 3D skill sphere, scroll effects), `three-hero` (the Three.js hero scene), `vendor/typed.umd.js`
- `assets/img` - photo, favicon, social preview; `assets/icons` - skill logos; `assets/svg` - the source diagrams that are inlined into `index.html` (the browser never fetches them separately)
- `Shubham-Kumar-Yadav-Resume-2026.pdf`, `robots.txt`, `sitemap.xml`, `.nojekyll`

No build step. Three.js loads from jsDelivr; everything else is in this repo.

## Run it locally

Serve the folder with any static server, then open it over http - the Three.js module needs http, not file://

```
python -m http.server 5510
# open http://127.0.0.1:5510/
```

## Deploy

Push to `main`. GitHub Pages serves the repo root at the URL above.
