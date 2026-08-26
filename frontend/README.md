# BeyondArk — Frontend (static assets)

> Part of the split repo — see the [top-level README](../README.md) for the full picture.

This folder is intentionally small: `public/css/style.css` and `public/js/main.js`,
the two static, rarely-changing files the backend's EJS views load. There's no
build step, framework, or bundler — just the design system and the small bits of
client-side JS (Mapbox init, the star-rating input) documented inline.

```
frontend/
└── public/
    ├── index.html      # static splash/landing page - "Launch app" links to the backend
    ├── css/style.css   # design tokens + component styles (indigo/madder/turmeric palette)
    └── js/main.js      # Mapbox GL loader + star-rating widget
```

`index.html` is a plain static page (no EJS) so this folder is deployable as-is to
any static host and shows something real at `/` instead of a blank page. Edit the
`window.BEYONDARK_BACKEND_URL` value near the top of `index.html` to point its
"Launch app" links at your deployed backend.

## Local preview
```bash
npm install
npm start        # http://localhost:5173
```
This is just for eyeballing the CSS/JS in isolation — the pages themselves only
render via the backend (EJS), so day-to-day development usually happens by running
`backend` alone (see the top-level README), which serves this folder automatically.

## Deploying

Push this folder to Netlify, Vercel, or Cloudflare Pages as a static site with
**publish directory: `public`**. Then set `ASSET_BASE_URL` in the backend's `.env`
to the URL you get, e.g.:

```
ASSET_BASE_URL=https://beyondark-frontend.netlify.app
```

Nothing here calls the backend at runtime (no fetch/XHR), so no CORS setup is
needed for this split. If you later turn this into a full SPA that calls the
backend as a JSON API, you'll need to add CORS handling on the backend at that point.
