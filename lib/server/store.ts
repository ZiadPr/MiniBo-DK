import { promises as fs } from "fs";
import path from "path";
import { Pool, type PoolClient } from "pg";
import { calculateKg, createId, ensureTrailingEmptyRow, getCurrentDate } from "@/lib/data/helpers";
import { seedStore } from "@/lib/data/seed";
import { applyRuntimeUserOverrides } from "@/lib/server/runtime-auth-config";
import type {
  MiniBoStore,
  Product,
  ProductDraft,
  ProductImportResult,
  ProductionNote,
  ProductionSession,
  ReportType,
  SessionRow,
  StoreMutationResponse
} from "@/lib/types";

const dataDirectoryPath = path.join(process.cwd(), "data");
export const dataFilePath = path.join(dataDirectoryPath, "minibo-store.json");

const STORE_KEY = "default";
const storeBackendMode = process.env.DATABASE_URL ? "postgres" : "file";
const requiresPersistentDatabase =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

let fileStoreOperationQueue: Promise<unknown> = Promise.resolve();

declare global {
  var __miniboPostgresPool: Pool | undefined;
}

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const assertPersistentDatabaseConfigured = () => {
  if (storeBackendMode === "file" && requiresPersistentDatabase) {
    throw new Error(
      "DATABASE_URL must be configured for production deployments. Local file storage is not persistent on Vercel."
    );
  }
};

const normalizeRows = (rows: SessionRow[]) =>
  ensureTrailingEmptyRow(
    rows.map((row) => ({
      ...row,
      quantityCartons: Number(row.quantityCartons || 0),
      quantityKg: Number(row.quantityKg || 0)
    }))
  );

const getPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!global.__miniboPostgresPool) {
    global.__miniboPostgresPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  return global.__miniboPostgresPool;
};

const normalizeStore = (store: MiniBoStore): MiniBoStore => ({
  ...store,
  sessions: store.sessions.map((session) => ({
    ...session,
    rows: normalizeRows(session.rows)
  }))
});

const applyRuntimeStoreOverrides = (store: MiniBoStore): MiniBoStore => ({
  ...store,
  users: applyRuntimeUserOverrides(store.users)
});

async function ensureStoreFile() {
  await fs.mkdir(dataDirectoryPath, { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch {
    await writeStoreFile(seedStore);
  }
}

async function readStoreFile(): Promise<MiniBoStore> {
  await ensureStoreFile();
  const rawValue = await fs.readFile(dataFilePath, "utf8");
  return JSON.parse(rawValue) as MiniBoStore;
}

async function writeStoreFile(store: MiniBoStore) {
  await fs.mkdir(dataDirectoryPath, { recursive: true });
  const tempFilePath = `${dataFilePath}.tmp`;
  await fs.writeFile(tempFilePath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempFilePath, dataFilePath);
}

async function ensureDatabaseSchema(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS minibo_brands (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS minibo_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL,
      conversion_factor NUMERIC(12,4) NOT NULL,
      brand_code TEXT NOT NULL REFERENCES minibo_brands(code),
      status TEXT NOT NULL,
      sub_group TEXT NOT NULL,
      main_group TEXT NOT NULL,
      custom_group TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS minibo_shifts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      hours_count INTEGER NOT NULL,
      allowed_brand_codes JSONB NOT NULL DEFAULT '[]'::jsonb
    );

    CREATE TABLE IF NOT EXISTS minibo_report_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description TEXT NOT NULL,
      filter_status TEXT,
      brand_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
      icon TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS minibo_required_rows (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      order_state TEXT NOT NULL,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      required_qty NUMERIC(12,4) NOT NULL,
      actual_qty NUMERIC(12,4) NOT NULL,
      warehouse_name TEXT NOT NULL,
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS minibo_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb
    );

    CREATE TABLE IF NOT EXISTS minibo_sessions (
      id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL REFERENCES minibo_shifts(id),
      brand_code TEXT NOT NULL REFERENCES minibo_brands(code),
      report_type TEXT NOT NULL,
      session_date DATE NOT NULL,
      started_by TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL,
      approvers JSONB NOT NULL DEFAULT '[]'::jsonb
    );

    CREATE TABLE IF NOT EXISTS minibo_session_rows (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES minibo_sessions(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES minibo_products(id),
      quantity_cartons NUMERIC(12,4) NOT NULL DEFAULT 0,
      quantity_kg NUMERIC(12,4) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS minibo_notes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES minibo_sessions(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES minibo_products(id),
      quantity_kg NUMERIC(12,4),
      note_time TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS minibo_history (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES minibo_sessions(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES minibo_products(id),
      quantity_cartons NUMERIC(12,4) NOT NULL,
      quantity_kg NUMERIC(12,4) NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_minibo_products_brand_status
      ON minibo_products (brand_code, status);

    CREATE INDEX IF NOT EXISTS idx_minibo_sessions_lookup
      ON minibo_sessions (shift_id, brand_code, report_type, session_date);

    CREATE INDEX IF NOT EXISTS idx_minibo_session_rows_session
      ON minibo_session_rows (session_id, sort_order);

    CREATE INDEX IF NOT EXISTS idx_minibo_history_session
      ON minibo_history (session_id, recorded_at);
  `);
}

async function getLegacyJsonbStore(client: PoolClient): Promise<MiniBoStore | null> {
  const legacyTableCheck = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'minibo_app_store'
      ) AS exists
    `
  );

  if (!legacyTableCheck.rows[0]?.exists) {
    return null;
  }

  const result = await client.query<{ state: MiniBoStore }>(
    `
      SELECT state
      FROM minibo_app_store
      WHERE store_key = $1
    `,
    [STORE_KEY]
  );

  return result.rows[0]?.state ? normalizeStore(result.rows[0].state) : null;
}

async function clearRelationalStoreTables(client: PoolClient) {
  await client.query(`
    DELETE FROM minibo_history;
    DELETE FROM minibo_notes;
    DELETE FROM minibo_session_rows;
    DELETE FROM minibo_sessions;
    DELETE FROM minibo_required_rows;
    DELETE FROM minibo_report_templates;
    DELETE FROM minibo_users;
    DELETE FROM minibo_products;
    DELETE FROM minibo_shifts;
    DELETE FROM minibo_brands;
  `);
}

async function importStoreIntoRelationalTables(client: PoolClient, rawStore: MiniBoStore) {
  const store = normalizeStore(rawStore);

  for (const brand of store.brands) {
    await client.query(
      `
        INSERT INTO minibo_brands (code, name, type, color, icon)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [brand.code, brand.name, brand.type, brand.color, brand.icon]
    );
  }

  for (const shift of store.shifts) {
    await client.query(
      `
        INSERT INTO minibo_shifts (id, name, start_time, end_time, hours_count, allowed_brand_codes)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [shift.id, shift.name, shift.startTime, shift.endTime, shift.hoursCount, JSON.stringify(shift.allowedBrandCodes)]
    );
  }

  for (const user of store.users) {
    await client.query(
      `
        INSERT INTO minibo_users (id, username, full_name, role, permissions)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [user.id, user.username, user.fullName, user.role, JSON.stringify(user.permissions)]
    );
  }

  for (const template of store.reportTemplates) {
    await client.query(
      `
        INSERT INTO minibo_report_templates (id, name, name_en, description, filter_status, brand_codes, icon, color)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      `,
      [
        template.id,
        template.name,
        template.nameEn,
        template.description,
        template.filterStatus,
        JSON.stringify(template.brandCodes),
        template.icon,
        template.color
      ]
    );
  }

  for (const product of store.products) {
    await client.query(
      `
        INSERT INTO minibo_products (
          id, name, code, unit, conversion_factor, brand_code, status, sub_group, main_group, custom_group, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        product.id,
        product.name,
        product.code,
        product.unit,
        product.conversionFactor,
        product.brandCode,
        product.status,
        product.subGroup,
        product.mainGroup,
        product.customGroup ?? null,
        product.isActive
      ]
    );
  }

  for (const row of store.requiredRows) {
    await client.query(
      `
        INSERT INTO minibo_required_rows (
          id, customer_name, order_state, product_code, product_name, required_qty, actual_qty, warehouse_name, comment
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        row.id,
        row.customerName,
        row.orderState,
        row.productCode,
        row.productName,
        row.requiredQty,
        row.actualQty,
        row.warehouseName,
        row.comment ?? null
      ]
    );
  }

  for (const session of store.sessions) {
    await client.query(
      `
        INSERT INTO minibo_sessions (
          id, shift_id, brand_code, report_type, session_date, started_by, started_at, status, approvers
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        session.id,
        session.shiftId,
        session.brandCode,
        session.reportType,
        session.sessionDate,
        session.startedBy,
        session.startedAt,
        session.status,
        JSON.stringify(session.approvers)
      ]
    );

    for (const [index, row] of session.rows.entries()) {
      await client.query(
        `
          INSERT INTO minibo_session_rows (
            id, session_id, product_id, quantity_cartons, quantity_kg, updated_at, sort_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          row.id,
          session.id,
          row.productId ?? null,
          row.quantityCartons,
          row.quantityKg,
          row.updatedAt ?? null,
          index
        ]
      );
    }

    for (const note of session.notes) {
      await client.query(
        `
          INSERT INTO minibo_notes (
            id, session_id, product_id, quantity_kg, note_time, note_text, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          note.id,
          session.id,
          note.productId ?? null,
          note.quantityKg ?? null,
          note.noteTime,
          note.noteText,
          note.createdAt
        ]
      );
    }

    for (const historyPoint of session.history) {
      await client.query(
        `
          INSERT INTO minibo_history (
            id, session_id, product_id, quantity_cartons, quantity_kg, recorded_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          historyPoint.id,
          session.id,
          historyPoint.productId,
          historyPoint.quantityCartons,
          historyPoint.quantityKg,
          historyPoint.recordedAt
        ]
      );
    }
  }
}

async function getRelationalStoreRowCount(client: PoolClient) {
  const result = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM minibo_brands`);
  return Number(result.rows[0]?.count ?? "0");
}

async function bootstrapRelationalStore(client: PoolClient) {
  await ensureDatabaseSchema(client);
  const count = await getRelationalStoreRowCount(client);

  if (count > 0) {
    return;
  }

  const legacyStore = await getLegacyJsonbStore(client);
  await importStoreIntoRelationalTables(client, legacyStore ?? seedStore);
}

async function readRelationalStore(client: PoolClient): Promise<MiniBoStore> {
  await ensureDatabaseSchema(client);
  await bootstrapRelationalStore(client);

  const [brandsResult, productsResult, shiftsResult, templatesResult, requiredRowsResult, usersResult, sessionsResult, rowsResult, notesResult, historyResult] =
    await Promise.all([
      client.query(`
        SELECT code, name, type, color, icon
        FROM minibo_brands
        ORDER BY code
      `),
      client.query(`
        SELECT id, name, code, unit, conversion_factor, brand_code, status, sub_group, main_group, custom_group, is_active
        FROM minibo_products
        ORDER BY name
      `),
      client.query(`
        SELECT id, name, start_time, end_time, hours_count, allowed_brand_codes
        FROM minibo_shifts
        ORDER BY name
      `),
      client.query(`
        SELECT id, name, name_en, description, filter_status, brand_codes, icon, color
        FROM minibo_report_templates
        ORDER BY id
      `),
      client.query(`
        SELECT id, customer_name, order_state, product_code, product_name, required_qty, actual_qty, warehouse_name, comment
        FROM minibo_required_rows
        ORDER BY customer_name, product_name
      `),
      client.query(`
        SELECT id, username, full_name, role, permissions
        FROM minibo_users
        ORDER BY username
      `),
      client.query(`
        SELECT id, shift_id, brand_code, report_type, session_date, started_by, started_at, status, approvers
        FROM minibo_sessions
        ORDER BY started_at DESC
      `),
      client.query(`
        SELECT id, session_id, product_id, quantity_cartons, quantity_kg, updated_at, sort_order
        FROM minibo_session_rows
        ORDER BY session_id, sort_order
      `),
      client.query(`
        SELECT id, session_id, product_id, quantity_kg, note_time, note_text, created_at
        FROM minibo_notes
        ORDER BY created_at DESC
      `),
      client.query(`
        SELECT id, session_id, product_id, quantity_cartons, quantity_kg, recorded_at
        FROM minibo_history
        ORDER BY recorded_at ASC
      `)
    ]);

  const sessions: ProductionSession[] = sessionsResult.rows.map((sessionRow) => ({
    id: sessionRow.id,
    shiftId: sessionRow.shift_id,
    brandCode: sessionRow.brand_code,
    reportType: sessionRow.report_type,
    sessionDate: sessionRow.session_date,
    startedBy: sessionRow.started_by,
    startedAt: new Date(sessionRow.started_at).toISOString(),
    status: sessionRow.status,
    approvers: sessionRow.approvers ?? [],
    rows: rowsResult.rows
      .filter((row) => row.session_id === sessionRow.id)
      .map((row) => ({
        id: row.id,
        productId: row.product_id ?? undefined,
        quantityCartons: Number(row.quantity_cartons),
        quantityKg: Number(row.quantity_kg),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
      })),
    notes: notesResult.rows
      .filter((note) => note.session_id === sessionRow.id)
      .map((note) => ({
        id: note.id,
        productId: note.product_id ?? undefined,
        quantityKg: note.quantity_kg === null ? undefined : Number(note.quantity_kg),
        noteTime: note.note_time,
        noteText: note.note_text,
        createdAt: new Date(note.created_at).toISOString()
      })),
    history: historyResult.rows
      .filter((historyPoint) => historyPoint.session_id === sessionRow.id)
      .map((historyPoint) => ({
        id: historyPoint.id,
        productId: historyPoint.product_id,
        quantityCartons: Number(historyPoint.quantity_cartons),
        quantityKg: Number(historyPoint.quantity_kg),
        recordedAt: new Date(historyPoint.recorded_at).toISOString()
      }))
  }));

  return normalizeStore({
    brands: brandsResult.rows.map((row) => ({
      code: row.code,
      name: row.name,
      type: row.type,
      color: row.color,
      icon: row.icon
    })),
    products: productsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      unit: row.unit,
      conversionFactor: Number(row.conversion_factor),
      brandCode: row.brand_code,
      status: row.status,
      subGroup: row.sub_group,
      mainGroup: row.main_group,
      customGroup: row.custom_group ?? undefined,
      isActive: row.is_active
    })),
    shifts: shiftsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      hoursCount: Number(row.hours_count),
      allowedBrandCodes: row.allowed_brand_codes ?? []
    })),
    reportTemplates: templatesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      nameEn: row.name_en,
      description: row.description,
      filterStatus: row.filter_status,
      brandCodes: row.brand_codes ?? [],
      icon: row.icon,
      color: row.color
    })),
    requiredRows: requiredRowsResult.rows.map((row) => ({
      id: row.id,
      customerName: row.customer_name,
      orderState: row.order_state,
      productCode: row.product_code,
      productName: row.product_name,
      requiredQty: Number(row.required_qty),
      actualQty: Number(row.actual_qty),
      warehouseName: row.warehouse_name,
      comment: row.comment ?? undefined
    })),
    users: usersResult.rows.map((row) => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      permissions: row.permissions ?? []
    })),
    sessions
  });
}

async function replaceRelationalStore(client: PoolClient, store: MiniBoStore) {
  await clearRelationalStoreTables(client);
  await importStoreIntoRelationalTables(client, store);
}

async function queueFileStoreOperation<T>(operation: () => Promise<T>): Promise<T> {
  const nextOperation = fileStoreOperationQueue.then(operation, operation);
  fileStoreOperationQueue = nextOperation.then(
    () => undefined,
    () => undefined
  );
  return nextOperation;
}

async function runStoreMutation<T>(mutator: (store: MiniBoStore) => Promise<T> | T) {
  assertPersistentDatabaseConfigured();

  if (storeBackendMode === "postgres") {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const store = await readRelationalStore(client);
      const result = await mutator(store);
      await replaceRelationalStore(client, store);
      await client.query("COMMIT");
      return createMutationResponse(store, result);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return queueFileStoreOperation(async () => {
    const store = await readStoreFile();
    const result = await mutator(store);
    await writeStoreFile(store);
    return createMutationResponse(store, result);
  });
}

const getSessionOrThrow = (store: MiniBoStore, sessionId: string) => {
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) {
    throw new Error("الجلسة غير موجودة");
  }
  return session;
};

const getRowOrThrow = (session: ProductionSession, rowId: string) => {
  const row = session.rows.find((item) => item.id === rowId);
  if (!row) {
    throw new Error("الصف غير موجود");
  }
  return row;
};

const getProductOrThrow = (store: MiniBoStore, productId: string) => {
  const product = store.products.find((item) => item.id === productId);
  if (!product) {
    throw new Error("الصنف غير موجود");
  }
  return product;
};

const assertBrandExists = (store: MiniBoStore, brandCode: string) => {
  if (!store.brands.some((brand) => brand.code === brandCode)) {
    throw new Error("البراند غير موجود");
  }
};

const assertShiftExists = (store: MiniBoStore, shiftId: string) => {
  if (!store.shifts.some((shift) => shift.id === shiftId)) {
    throw new Error("الوردية غير موجودة");
  }
};

const assertUniqueProductCode = (store: MiniBoStore, code: string) => {
  const normalizedCode = code.trim().toLowerCase();
  if (store.products.some((product) => product.code.trim().toLowerCase() === normalizedCode)) {
    throw new Error("كود الصنف مستخدم بالفعل");
  }
};

const createMutationResponse = <T>(store: MiniBoStore, result?: T): StoreMutationResponse<T> => ({
  store: cloneValue(applyRuntimeStoreOverrides(store)),
  result
});

export const getStorageBackend = () => storeBackendMode;
export const getPostgresPool = () => getPool();
export const isPersistentDatabaseRequired = () => requiresPersistentDatabase;

export async function getStore() {
  assertPersistentDatabaseConfigured();

  if (storeBackendMode === "postgres") {
    const pool = getPool();
    const client = await pool.connect();

    try {
      return cloneValue(applyRuntimeStoreOverrides(await readRelationalStore(client)));
    } finally {
      client.release();
    }
  }

  return cloneValue(applyRuntimeStoreOverrides(await readStoreFile()));
}

export async function ensureSessionMutation(input: {
  shiftId: string;
  brandCode: string;
  reportType: ReportType;
  startedBy?: string;
}) {
  return runStoreMutation((store) => {
    assertShiftExists(store, input.shiftId);
    assertBrandExists(store, input.brandCode);

    let session = store.sessions.find(
      (item) =>
        item.shiftId === input.shiftId &&
        item.brandCode === input.brandCode &&
        item.reportType === input.reportType &&
        item.sessionDate === getCurrentDate()
    );

    if (!session) {
      session = {
        id: createId("session"),
        shiftId: input.shiftId,
        brandCode: input.brandCode,
        reportType: input.reportType,
        sessionDate: getCurrentDate(),
        startedBy: input.startedBy ?? "usr-supervisor",
        startedAt: new Date().toISOString(),
        status: "open",
        approvers: ["مدير الجودة", "مدير الإنتاج"],
        rows: [{ id: createId("row"), quantityCartons: 0, quantityKg: 0 }],
        notes: [],
        history: []
      };
      store.sessions.push(session);
    }

    return { sessionId: session.id };
  });
}

export async function updateRowProductMutation(input: {
  sessionId: string;
  rowId: string;
  productId: string;
}) {
  return runStoreMutation((store) => {
    const session = getSessionOrThrow(store, input.sessionId);
    const row = getRowOrThrow(session, input.rowId);
    const product = getProductOrThrow(store, input.productId);

    const duplicatedProduct = session.rows.some(
      (item) => item.id !== input.rowId && item.productId === input.productId
    );
    if (duplicatedProduct) {
      throw new Error("الصنف مضاف بالفعل في نفس الجلسة");
    }

    row.productId = product.id;
    row.quantityKg = calculateKg(row.quantityCartons, product.conversionFactor);
    row.updatedAt = new Date().toISOString();
    session.rows = normalizeRows(session.rows);
  });
}

export async function updateRowQuantityMutation(input: {
  sessionId: string;
  rowId: string;
  quantityCartons: number;
}) {
  return runStoreMutation((store) => {
    const session = getSessionOrThrow(store, input.sessionId);
    const row = getRowOrThrow(session, input.rowId);

    if (!row.productId && input.quantityCartons > 0) {
      throw new Error("اختر الصنف أولاً قبل إدخال الكمية");
    }

    const product = row.productId ? getProductOrThrow(store, row.productId) : null;
    row.quantityCartons = Number(input.quantityCartons);
    row.quantityKg = product ? calculateKg(row.quantityCartons, product.conversionFactor) : 0;
    row.updatedAt = new Date().toISOString();
    session.rows = normalizeRows(session.rows);

    if (product) {
      session.history.push({
        id: createId("hist"),
        productId: product.id,
        quantityCartons: row.quantityCartons,
        quantityKg: row.quantityKg,
        recordedAt: new Date().toISOString()
      });
    }
  });
}

export async function addRowMutation(input: { sessionId: string }) {
  return runStoreMutation((store) => {
    const session = getSessionOrThrow(store, input.sessionId);
    session.rows = normalizeRows([
      ...session.rows,
      { id: createId("row"), quantityCartons: 0, quantityKg: 0 }
    ]);
  });
}

export async function deleteRowMutation(input: { sessionId: string; rowId: string }) {
  return runStoreMutation((store) => {
    const session = getSessionOrThrow(store, input.sessionId);
    session.rows = normalizeRows(session.rows.filter((row) => row.id !== input.rowId));
  });
}

export async function addNoteMutation(input: {
  sessionId: string;
  note: Omit<ProductionNote, "id" | "createdAt">;
}) {
  return runStoreMutation((store) => {
    const session = getSessionOrThrow(store, input.sessionId);

    if (input.note.productId) {
      getProductOrThrow(store, input.note.productId);
    }

    session.notes.unshift({
      ...input.note,
      id: createId("note"),
      createdAt: new Date().toISOString()
    });
  });
}

export async function submitSessionMutation(input: { sessionId: string }) {
  return runStoreMutation((store) => {
    const session = getSessionOrThrow(store, input.sessionId);
    session.status = "submitted";
  });
}

export async function approveSessionMutation(input: { sessionId: string }) {
  return runStoreMutation((store) => {
    const session = getSessionOrThrow(store, input.sessionId);
    session.status = "approved";
  });
}

export async function addProductMutation(input: { product: ProductDraft }) {
  return runStoreMutation((store) => {
    assertBrandExists(store, input.product.brandCode);
    assertUniqueProductCode(store, input.product.code);

    const product: Product = {
      id: createId("prd"),
      name: input.product.name.trim(),
      code: input.product.code.trim(),
      unit: input.product.unit,
      conversionFactor: Number(input.product.conversionFactor),
      brandCode: input.product.brandCode,
      status: input.product.status,
      subGroup: input.product.subGroup.trim(),
      mainGroup: input.product.mainGroup.trim(),
      customGroup: input.product.customGroup?.trim() || undefined,
      isActive: true
    };

    store.products.unshift(product);
    return { productId: product.id };
  });
}

export async function importProductsMutation(input: { products: ProductDraft[] }) {
  return runStoreMutation((store) => {
    const result: ProductImportResult = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    input.products.forEach((draft, index) => {
      const rowNumber = index + 2;
      const code = draft.code.trim();
      const name = draft.name.trim();

      if (!name || !code) {
        result.skipped += 1;
        result.errors.push({ row: rowNumber, reason: "الاسم أو الكود فارغ" });
        return;
      }

      if (/^\d+$/.test(code)) {
        result.skipped += 1;
        result.errors.push({ row: rowNumber, reason: "الكود رقمي فقط وتم تجاهله" });
        return;
      }

      if (!store.brands.some((brand) => brand.code === draft.brandCode)) {
        result.skipped += 1;
        result.errors.push({ row: rowNumber, reason: `البراند غير معروف: ${draft.brandCode}` });
        return;
      }

      const normalizedDraft: ProductDraft = {
        ...draft,
        name,
        code,
        subGroup: draft.subGroup.trim(),
        mainGroup: draft.mainGroup.trim(),
        customGroup: draft.customGroup?.trim() || undefined
      };

      const existingProduct = store.products.find(
        (product) => product.code.trim().toLowerCase() === normalizedDraft.code.toLowerCase()
      );

      if (existingProduct) {
        existingProduct.name = normalizedDraft.name;
        existingProduct.unit = normalizedDraft.unit;
        existingProduct.conversionFactor = Number(normalizedDraft.conversionFactor);
        existingProduct.brandCode = normalizedDraft.brandCode;
        existingProduct.status = normalizedDraft.status;
        existingProduct.subGroup = normalizedDraft.subGroup;
        existingProduct.mainGroup = normalizedDraft.mainGroup;
        existingProduct.customGroup = normalizedDraft.customGroup;
        existingProduct.isActive = true;
        result.updated += 1;
        return;
      }

      const product: Product = {
        id: createId("prd"),
        name: normalizedDraft.name,
        code: normalizedDraft.code,
        unit: normalizedDraft.unit,
        conversionFactor: Number(normalizedDraft.conversionFactor),
        brandCode: normalizedDraft.brandCode,
        status: normalizedDraft.status,
        subGroup: normalizedDraft.subGroup,
        mainGroup: normalizedDraft.mainGroup,
        customGroup: normalizedDraft.customGroup,
        isActive: true
      };

      store.products.unshift(product);
      result.added += 1;
    });

    return result;
  });
}

export async function setProductActiveMutation(input: {
  productId: string;
  isActive: boolean;
}) {
  return runStoreMutation((store) => {
    const product = getProductOrThrow(store, input.productId);
    product.isActive = input.isActive;
  });
}
