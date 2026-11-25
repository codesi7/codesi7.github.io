# Codei7 Operations Admin Dashboard

A corporate **Next.js (App Router, TypeScript, Tailwind CSS)** Admin Panel Dashboard powered by **14 public JSON datasets** converted from `Data.xlsx`, featuring **TanStack DataTable**, multi-format exports, **Recharts** analytics, **Login-sheet session authentication**, and **SweetAlert2 CRUD** with live **GitHub Contents API persistence**.

## Live Deployment Architecture (GitHub + Vercel)

> **Why Vercel + GitHub?** GitHub Pages only serves static HTML/JS and cannot run Next.js API routes (`/api/auth/*`, `/api/data/*`). Deploying the GitHub repo on **Vercel** with `GITHUB_TOKEN` gives you a live HTTPS dashboard where every Create / Edit / Delete directly updates `public/data/*.json` in this GitHub repository.

### 1. Push Code & Public JSON to GitHub
```powershell
git push -u origin main
```

### 2. Deploy Live on Vercel (Connected to GitHub)
1. Go to [vercel.com/new](https://vercel.com/new) and import `codesi7/codei7`.
2. Add these **Environment Variables** in Vercel Project Settings:
   - `AUTH_SECRET` — any strong random string (e.g. 32+ chars)
   - `GITHUB_TOKEN` — GitHub Personal Access Token (Fine-grained or classic `repo` scope for `codesi7/codei7`) so live CRUD persists directly into `public/data/*.json` on GitHub
   - `NEXT_PUBLIC_GITHUB_OWNER` = `codesi7`
   - `NEXT_PUBLIC_GITHUB_REPO` = `codei7`
   - `NEXT_PUBLIC_GITHUB_BRANCH` = `main`
   - `NEXT_PUBLIC_GITHUB_DATA_PATH` = `public/data`
3. Click **Deploy**. Check `/api/health` to confirm `githubWriteEnabled: true`.

## Public JSON Datasets (`public/data/`)

All 14 sheets from `Data.xlsx` are stored in `public/data/` alongside `manifest.json`:

| Module | Local Endpoint | GitHub Public Raw URL |
|---|---|---|
| Manifest | `/data/manifest.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/manifest.json` |
| Stock Inventory | `/data/stock.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/stock.json` |
| AnyDesk & RustDesk | `/data/anydesk.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/anydesk.json` |
| IT Support Runbooks | `/data/support.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/support.json` |
| CCTV Cameras | `/data/camera.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/camera.json` |
| Outlet Hardware & POS | `/data/outlet-laptop.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/outlet-laptop.json` |
| Corporate Laptops | `/data/corporate-laptop.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/corporate-laptop.json` |
| EDC & Payment Terminals | `/data/edc.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/edc.json` |
| Outlet Webmail & Prime | `/data/prime-details.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/prime-details.json` |
| IT & Ops Tickets | `/data/know-ticket.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/know-ticket.json` |
| Used Oil Collection | `/data/used-oil-collection.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/used-oil-collection.json` |
| Camera Credentials | `/data/camera-password.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/camera-password.json` |
| Admin Users (`Login`) | `/data/login.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/login.json` |
| Internet & Broadband | `/data/internet.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/internet.json` |
| NAN Outlet Wi-Fi | `/data/nan.json` | `https://raw.githubusercontent.com/codesi7/codei7/main/public/data/nan.json` |

## Local Development

```powershell
npm.cmd install
npm.cmd run convert:excel   # Re-convert Data.xlsx into public/data/*.json
npm.cmd run dev             # Start local server at http://localhost:3000
npm.cmd run build           # Production build
```
