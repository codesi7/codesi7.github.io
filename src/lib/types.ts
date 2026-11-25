export type ColumnFieldType =
  | "text"
  | "number"
  | "date"
  | "email"
  | "url"
  | "password"
  | "badge"
  | "textarea";

export interface ColumnSchema {
  key: string;
  label: string;
  type: ColumnFieldType;
  sensitive?: boolean;
}

export interface DatasetMeta {
  slug: string;
  sheetName: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  fileName: string;
  localUrl: string;
  githubRawUrl: string;
  githubBlobUrl: string;
  recordCount: number;
  columns: ColumnSchema[];
  updatedAt: string;
}

export interface DatasetManifest {
  sourceFile: string;
  generatedAt: string;
  github: {
    owner: string;
    repo: string;
    branch: string;
    baseRawUrl: string;
    repoUrl: string;
  };
  totalDatasets: number;
  totalRecords: number;
  datasets: DatasetMeta[];
}

export type DataRecord = {
  _id: string;
  [key: string]: string | number | boolean | null | undefined;
};

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface DashboardOverviewStats {
  totalDatasets: number;
  totalRecords: number;
  totalAnydesk: number;
  totalCameras: number;
  activeCameras: number;
  totalOutlets: number;
  totalCorporateLaptops: number;
  totalInternetLinks: number;
  totalNanWifi: number;
  totalEdcTerminals: number;
  totalPrimeWebmails: number;
  anydeskByState: { name: string; count: number }[];
  cameraByStatus: { name: string; value: number }[];
  internetByBrand: { name: string; value: number }[];
  hardwareByZone: { zone: string; laptops: number; pos: number; printers: number; cameras: number }[];
  recentAnydesk: DataRecord[];
  recentStock: DataRecord[];
}
