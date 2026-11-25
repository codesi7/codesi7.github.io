# Codei7 Corporate Operations Admin Dashboard

A corporate-grade **Next.js (App Router, TypeScript, Tailwind CSS)** Admin Panel Dashboard powered by **14 public JSON datasets** converted from `Data.xlsx`, featuring **Framer Motion** animations, **TanStack DataTable**, multi-format exports, **Recharts** executive analytics, **Login-sheet session authentication**, and complete **SweetAlert2 CRUD**.

## Public JSON Datasets (`public/data/`)

All 14 Excel sheets from `Data.xlsx` are converted into clean JSON files under `public/data/` (plus `manifest.json`):

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

## Key Features

- **Authentication (`Login` Sheet)**: Sign-in verified against `public/data/login.json` with HMAC-SHA256 signed HTTP-only session cookies and route protection middleware.
- **Executive Overview Dashboard**: Animated KPI counters, interactive Recharts visualizations (Tickets by Category & Severity, Hardware by Zone, Used Oil Collection by Division), and quick access to all 14 datasets.
- **Enterprise DataTable (`@tanstack/react-table`)**:
  - Instant global search + auto-detected categorical faceted dropdown filters
  - Multi-column sorting, column visibility toggles, and table density modes
  - Password/credential masking with per-cell reveal & copy-to-clipboard
  - Row selection & bulk actions + Slide-over Record Inspector Drawer
- **Complete SweetAlert2 CRUD**: Create, Edit, Delete, Bulk Delete, Login/Logout, Export Wizard, and GitHub Raw Sync all driven by corporate-themed SweetAlert2 modals and toasts.
- **Export Suite**: Export filtered or selected rows to **Excel (`.xlsx`)**, **CSV (`.csv`)**, **JSON (`.json`)**, or **Print / PDF**.

## Scripts

```bash
npm install
npm run convert:excel   # Re-convert Data.xlsx into public/data/*.json
npm run dev             # Start local development server
npm run build           # Production build
```
