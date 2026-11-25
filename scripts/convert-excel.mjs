import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const ROOT = process.cwd();
const EXCEL_PATH = path.join(ROOT, "Data.xlsx");
const OUT_DIR = path.join(ROOT, "public", "data");

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || "codesi7";
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "codesi7.github.io";
const GITHUB_BRANCH = process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main";

const SHEET_META = {
  "Stock": {
    slug: "stock",
    title: "Stock Inventory",
    category: "Hardware & Assets",
    icon: "Package",
    description: "Store-level IT hardware stock dispatches, dates, and recipients.",
  },
  "Anydesk": {
    slug: "anydesk",
    title: "AnyDesk & RustDesk",
    category: "Connectivity & Remote",
    icon: "MonitorSmartphone",
    description: "Remote desktop access IDs and credentials across outlet POS & laptops.",
  },
  "Support": {
    slug: "support",
    title: "IT Support Runbooks",
    category: "Operations & Incidents",
    icon: "LifeBuoy",
    description: "Standard troubleshooting commands, scripts, and support utilities.",
  },
  "Camera": {
    slug: "camera",
    title: "CCTV Cameras",
    category: "Connectivity & Remote",
    icon: "Camera",
    description: "Store CCTV camera counts, premise types, and active operational status.",
  },
  "Outlet Laptop": {
    slug: "outlet-laptop",
    title: "Outlet Hardware & POS",
    category: "Hardware & Assets",
    icon: "Store",
    description: "Zone-wise outlet laptops, POS terminals, printers, DMB, LED, and cameras.",
  },
  "Corporate Laptop": {
    slug: "corporate-laptop",
    title: "Corporate Laptops",
    category: "Hardware & Assets",
    icon: "Laptop",
    description: "Employee laptop allocations, serials, adapters, and asset IDs.",
  },
  "EDC": {
    slug: "edc",
    title: "EDC & Payment Terminals",
    category: "Hardware & Assets",
    icon: "CreditCard",
    description: "Paytm MID and Pinelabs Store/Client terminal deployments.",
  },
  "Prime-details": {
    slug: "prime-details",
    title: "Outlet Webmail & Prime",
    category: "Accounts & Access",
    icon: "Mail",
    description: "City and outlet webmail login portals and account credentials.",
  },
  "Know-Ticket": {
    slug: "know-ticket",
    title: "IT & Ops Tickets",
    category: "Operations & Incidents",
    icon: "Ticket",
    description: "Operational incident and maintenance tickets with severity and ageing.",
  },
  "Used-Oil-Collection": {
    slug: "used-oil-collection",
    title: "Used Oil Collection",
    category: "Operations & Incidents",
    icon: "Droplets",
    description: "Outlet used cooking oil collection submissions, tin counts, and weights.",
  },
  "Camera-Password": {
    slug: "camera-password",
    title: "Camera Credentials",
    category: "Connectivity & Remote",
    icon: "KeyRound",
    description: "NVR/DVR admin credentials paired with store AnyDesk access.",
  },
  "Login": {
    slug: "login",
    title: "Admin Users",
    category: "Accounts & Access",
    icon: "ShieldCheck",
    description: "Authorized dashboard user accounts, roles, and active status.",
  },
  "Internet": {
    slug: "internet",
    title: "Internet & Broadband",
    category: "Connectivity & Remote",
    icon: "Wifi",
    description: "Kitchen & outlet broadband accounts, ISP brands, Wi-Fi and router details.",
  },
  "NAN": {
    slug: "nan",
    title: "NAN Outlet Wi-Fi",
    category: "Connectivity & Remote",
    icon: "Router",
    description: "Primary and secondary Wi-Fi SSIDs and passwords by outlet location.",
  },
};

function excelSerialToString(serial) {
  if (typeof serial !== "number" || Number.isNaN(serial)) return String(serial ?? "");
  // Excel epoch starts 1899-12-30
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  const fractionalDay = serial - Math.floor(serial);
  const totalSeconds = Math.round(fractionalDay * 86400);
  const date = new Date(utcMs + totalSeconds * 1000);
  if (Number.isNaN(date.getTime())) return String(serial);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");

  if (totalSeconds === 0) {
    return `${yyyy}-${mm}-${dd}`;
  }
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function cleanHeader(raw, index, seenMap, prevHeaders) {
  let h = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!h) return "";

  // Fix known typos / disambiguate duplicate headers meaningfully
  if (h === "Passowrd") h = "Password";
  if (h === "Webamail Password") h = "Webmail Password";

  const count = seenMap.get(h) || 0;
  seenMap.set(h, count + 1);

  if (count === 0) return h;

  const prev = prevHeaders[index - 1] || "";
  if (h === "Password" && prev.toLowerCase().includes("anydesk")) {
    return "Anydesk Password";
  }
  if (h === "Password" && prev.toLowerCase().includes("router")) {
    return "Router Password";
  }
  if (h === "Wi-Fi Name") {
    return `Secondary Wi-Fi Name`;
  }
  if (h === "Password") {
    return `Secondary Password`;
  }
  return `${h} (${count + 1})`;
}

function isDateHeader(header) {
  const lower = header.toLowerCase();
  return (
    lower.includes("date") ||
    lower === "sent at" ||
    lower.includes("created on")
  );
}

function isNumericQuantityHeader(header) {
  const lower = header.toLowerCase();
  return (
    lower.includes("quantity") ||
    lower === "no" ||
    lower === "camera no" ||
    lower === "number of tins" ||
    lower.includes("kgs") ||
    lower === "submission number"
  );
}

function formatCellValue(cell, header) {
  if (!cell) return "";
  const { t, v, w } = cell;

  if (v === undefined || v === null) return "";

  if (t === "n" && typeof v === "number") {
    // Check if column is a date serial (Excel dates around 2000-2035 are 36526..49674)
    if (isDateHeader(header) && v > 30000 && v < 60000) {
      return excelSerialToString(v);
    }
    // Keep clean numeric types for actual quantities
    if (isNumericQuantityHeader(header)) {
      return Number.isInteger(v) ? v : Number(v.toFixed(2));
    }
    // IDs, phone numbers, Pinelab IDs, Ticket IDs -> clean string without scientific notation
    if (Number.isInteger(v)) {
      return String(v);
    }
    if (w && !/[eE]/.test(w)) {
      return w.trim();
    }
    return String(v);
  }

  const str = String(v).replace(/\r\n/g, "\n").trim();
  return str;
}

function isPasswordField(header) {
  const lower = header.toLowerCase();
  return lower.includes("password") || lower.includes("passowrd");
}

function inferFieldType(header, values) {
  const lower = header.toLowerCase();
  if (isPasswordField(header)) return "password";
  if (lower.includes("url")) return "url";
  if (lower.includes("email") || lower.includes("e-mail") || lower.includes("username")) {
    if (values.some((v) => String(v).includes("@"))) return "email";
  }
  if (isDateHeader(header)) return "date";
  if (isNumericQuantityHeader(header)) return "number";
  if (lower === "status" || lower === "current status" || lower === "severity" || lower === "role") {
    return "badge";
  }
  if (lower === "issue" || lower === "remarks" || lower === "remark") return "textarea";
  return "text";
}

function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error("Data.xlsx not found at", EXCEL_PATH);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const workbook = XLSX.readFile(EXCEL_PATH, { cellText: true, cellDates: false });

  const manifestDatasets = [];

  for (const rawSheetName of workbook.SheetNames) {
    const trimmedName = rawSheetName.trim();
    const meta = SHEET_META[trimmedName] || {
      slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: trimmedName,
      category: "General",
      icon: "Table",
      description: `Dataset converted from sheet ${trimmedName}.`,
    };

    const ws = workbook.Sheets[rawSheetName];
    if (!ws || !ws["!ref"]) continue;

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const seenHeaders = new Map();
    const rawHeaders = [];

    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const cell = ws[addr];
      const cleaned = cleanHeader(cell ? cell.v : "", C, seenHeaders, rawHeaders);
      rawHeaders.push(cleaned);
    }

    // Active columns (non-empty headers)
    const activeCols = [];
    rawHeaders.forEach((h, idx) => {
      if (h) activeCols.push({ index: idx, name: h });
    });

    const records = [];
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const rowObj = {};
      let hasData = false;

      for (const col of activeCols) {
        const addr = XLSX.utils.encode_cell({ r: R, c: col.index });
        const val = formatCellValue(ws[addr], col.name);
        if (val !== "" && val !== null && val !== undefined) {
          hasData = true;
        }
        rowObj[col.name] = val;
      }

      if (hasData) {
        records.push({
          _id: `${meta.slug}-${records.length + 1}`,
          ...rowObj,
        });
      }
    }

    const columns = activeCols.map((col) => {
      const sampleValues = records.slice(0, 50).map((r) => r[col.name]);
      return {
        key: col.name,
        label: col.name,
        type: inferFieldType(col.name, sampleValues),
        sensitive: isPasswordField(col.name),
      };
    });

    const fileName = `${meta.slug}.json`;
    const filePath = path.join(OUT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");

    manifestDatasets.push({
      slug: meta.slug,
      sheetName: rawSheetName,
      title: meta.title,
      category: meta.category,
      icon: meta.icon,
      description: meta.description,
      fileName,
      localUrl: `/data/${fileName}`,
      githubRawUrl: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/public/data/${fileName}`,
      githubBlobUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/public/data/${fileName}`,
      recordCount: records.length,
      columns,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Converted "${rawSheetName}" -> public/data/${fileName} (${records.length} records, ${columns.length} cols)`);
  }

  const manifest = {
    sourceFile: "Data.xlsx",
    generatedAt: new Date().toISOString(),
    github: {
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      branch: GITHUB_BRANCH,
      baseRawUrl: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/public/data`,
      repoUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`,
    },
    totalDatasets: manifestDatasets.length,
    totalRecords: manifestDatasets.reduce((sum, d) => sum + d.recordCount, 0),
    datasets: manifestDatasets,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log(`\nManifest written: ${manifest.totalDatasets} datasets, ${manifest.totalRecords} total records.`);
}

main();
