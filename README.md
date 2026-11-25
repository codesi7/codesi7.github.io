# Codei7 Operations Admin Dashboard (GitHub Pages)

A corporate **Next.js (App Router, TypeScript, Tailwind CSS)** Admin Panel Dashboard hosted **100% on GitHub Pages** at `https://codesi7.github.io/` with **14 public JSON datasets** converted from `Data.xlsx`.

## Live GitHub URLs

- **Live Dashboard**: `https://codesi7.github.io/`
- **Live JSON Endpoints (GitHub Pages)**: `https://codesi7.github.io/data/<sheet>.json` (e.g. `https://codesi7.github.io/data/support.json`)
- **Live JSON Endpoints (GitHub Raw)**: `https://raw.githubusercontent.com/codesi7/codesi7.github.io/main/public/data/<sheet>.json`

## Complete CRUD on GitHub Pages

- **Login (`Login` Sheet)**: Authenticates against `public/data/login.json` (`khalid@gmail.com` / `khalid@gmail.com`, role `admin`, status `active`).
- **Browser + Direct GitHub Commit CRUD**:
  - Click **Connect GitHub Token** (or **GitHub Write** in the top bar) and enter a GitHub Personal Access Token with `repo` / `Contents: Read & Write` permission on `codesi7/codesi7.github.io`.
  - Every **Add Record**, **Edit**, **Delete**, and **Bulk Delete** (with SweetAlert2 confirmation) commits directly to `public/data/<sheet>.json` and `public/data/manifest.json` on GitHub, which automatically triggers GitHub Pages to redeploy `https://codesi7.github.io/data/<sheet>.json`.
