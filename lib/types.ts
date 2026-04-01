export type ProductStatus = "FR" | "FZ" | "ALL" | "SLH";
export type BrandType = "fresh" | "frozen" | "both" | "special";
export type ReportType = "fresh" | "frozen";
export type UnitType = "كجم" | "عدد";

export interface Brand {
  code: string;
  name: string;
  type: BrandType;
  color: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  unit: UnitType;
  conversionFactor: number;
  brandCode: string;
  status: ProductStatus;
  subGroup: string;
  mainGroup: string;
  customGroup?: string;
  isActive: boolean;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  hoursCount: number;
  allowedBrandCodes: string[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  filterStatus: ProductStatus | null;
  brandCodes: string[];
  icon: string;
  color: string;
}

export interface SessionRow {
  id: string;
  productId?: string;
  quantityCartons: number;
  quantityKg: number;
  updatedAt?: string;
}

export interface ProductionNote {
  id: string;
  productId?: string;
  quantityKg?: number;
  noteTime: string;
  noteText: string;
  createdAt: string;
}

export interface ProductionHistoryPoint {
  id: string;
  productId: string;
  quantityCartons: number;
  quantityKg: number;
  recordedAt: string;
}

export interface ProductionSession {
  id: string;
  shiftId: string;
  brandCode: string;
  reportType: ReportType;
  sessionDate: string;
  startedBy: string;
  startedAt: string;
  status: "open" | "submitted" | "approved";
  rows: SessionRow[];
  notes: ProductionNote[];
  history: ProductionHistoryPoint[];
  approvers: string[];
}

export interface RequiredRow {
  id: string;
  customerName: string;
  orderState: string;
  productCode: string;
  productName: string;
  requiredQty: number;
  actualQty: number;
  warehouseName: string;
  comment?: string;
}

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

export interface MiniBoStore {
  brands: Brand[];
  products: Product[];
  shifts: Shift[];
  reportTemplates: ReportTemplate[];
  requiredRows: RequiredRow[];
  users: UserSummary[];
  sessions: ProductionSession[];
}

export interface ProductDraft {
  name: string;
  code: string;
  unit: UnitType;
  conversionFactor: number;
  brandCode: string;
  status: ProductStatus;
  subGroup: string;
  mainGroup: string;
  customGroup?: string;
}

export interface ProductImportError {
  row: number;
  reason: string;
}

export interface ProductImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: ProductImportError[];
}

export interface StoreMutationResponse<T = unknown> {
  store: MiniBoStore;
  result?: T;
}

export interface StorageRecordCounts {
  brands: number;
  products: number;
  shifts: number;
  reportTemplates: number;
  requiredRows: number;
  users: number;
  sessions: number;
  sessionRows: number;
  notes: number;
  history: number;
}

export interface StorageFileDiagnostics {
  path: string;
  exists: boolean;
  sizeBytes: number;
  lastModifiedAt?: string;
}

export interface StoragePostgresDiagnostics {
  host?: string;
  port?: string;
  database?: string;
  connected: boolean;
  latencyMs?: number;
  serverTime?: string;
  schemaReady: boolean;
  legacyTablePresent: boolean;
}

export interface StorageDiagnostics {
  backend: "file" | "postgres";
  checkedAt: string;
  healthy: boolean;
  databaseUrlConfigured: boolean;
  warnings: string[];
  error?: string;
  recordCounts?: StorageRecordCounts;
  file?: StorageFileDiagnostics;
  postgres?: StoragePostgresDiagnostics;
}
