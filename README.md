# Codei7 Operations Admin Dashboard (GitHub Pages)

A corporate **Next.js (App Router, TypeScript, Tailwind CSS)** Admin Panel Dashboard hosted **100% on GitHub Pages** with **14 public JSON datasets** converted from `Data.xlsx`.

## Live GitHub URLs

- **Live Dashboard (GitHub Pages)**: `https://codesi7.github.io/codei7/`
- **Public JSON Endpoints**: `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/<sheet>.json` (and `https://codesi7.github.io/codei7/data/<sheet>.json`)

## How Login & CRUD Work on GitHub Pages Only

- **Login (`Login` Sheet)**: Authenticates against `public/data/login.json` (`khalid@gmail.com` / `khalid@gmail.com`, role `admin`, status `active`).
- **Instant Browser CRUD + Optional Direct GitHub Repo Commits**:
  - Every **Create, Edit, Delete, and Bulk Delete** (with SweetAlert2 confirmation modals) works immediately in your browser (`localStorage`) so the live dashboard is interactive out of the box.
  - To save CRUD edits directly into the `public/data/*.json` files in GitHub from the live GitHub Pages site, click **GitHub Write** in the top bar and paste a GitHub Personal Access Token (`Contents: Read & Write` on `codesi7/codei7`). All CRUD operations will then commit straight to GitHub automatically.

## Enable GitHub Pages (One-Time Setup)

1. Push to GitHub:
   ```powershell
   git push -u origin main
   ```
2. Open **GitHub → `codesi7/codei7` → Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The workflow [deploy-pages.yml](.github/workflows/deploy-pages.yml) builds the static Next.js export (`./out`) and publishes it to `https://codesi7.github.io/codei7/`.
