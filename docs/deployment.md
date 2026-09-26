# Deployment

The build output (`dist/`) is plain static files, so any static host can serve it. The
repository includes automatic deployment to **GitHub Pages**.

## GitHub Pages (automatic)

1. Push the repository to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`.

What happens:

1. `.github/workflows/ci.yml` runs formatting, lint, type-check, unit tests with coverage, the
   production build, and Playwright end-to-end tests.
2. When CI succeeds on `main`, `.github/workflows/deploy.yml` builds with the right settings and
   publishes with `actions/deploy-pages`. You can also run it manually (**Actions → Deploy to
   GitHub Pages → Run workflow**).

The deploy build sets:

| Variable           | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| `BASE_PATH`        | `/<repository>/`, or `/` for `<owner>.github.io` repositories       |
| `VITE_REPO_URL`    | The repository URL (used by Help → Documentation / Report an issue) |
| `VITE_APP_VERSION` | `version` from `package.json` (shown in Help → About)               |

## Other static hosts

```bash
BASE_PATH=/ npm run build
```

Upload `dist/`. No rewrite rules are needed because routes are hash-based (`/#/editor/…`). If you
serve the app from a sub-path, set `BASE_PATH` to that path with leading and trailing slashes.

## Recommended HTTP headers

If your host lets you set headers, these are safe for this app:

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-<hash of the inline theme script>' 'wasm-unsafe-eval'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

`'wasm-unsafe-eval'` is needed from Phase 2 (HarfBuzz WebAssembly). The inline script in
`index.html` applies the saved theme before first paint. Compute its hash after building, or move
it to a file if your policy disallows inline scripts. GitHub Pages does not support custom headers.
