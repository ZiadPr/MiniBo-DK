import { promises as fs } from "fs";
import type { MiniBoStore, StorageDiagnostics, StorageRecordCounts } from "@/lib/types";
import {
  dataFilePath,
  getPostgresPool,
  getStorageBackend,
  getStore,
  isPersistentDatabaseRequired
} from "@/lib/server/store";

const requiredTableNames = [
  "minibo_brands",
  "minibo_products",
  "minibo_shifts",
  "minibo_report_templates",
  "minibo_required_rows",
  "minibo_users",
  "minibo_sessions",
  "minibo_session_rows",
  "minibo_notes",
  "minibo_history"
];

const buildRecordCounts = (store: MiniBoStore): StorageRecordCounts => ({
  brands: store.brands.length,
  products: store.products.length,
  shifts: store.shifts.length,
  reportTemplates: store.reportTemplates.length,
  requiredRows: store.requiredRows.length,
  users: store.users.length,
  sessions: store.sessions.length,
  sessionRows: store.sessions.reduce((total, session) => total + session.rows.length, 0),
  notes: store.sessions.reduce((total, session) => total + session.notes.length, 0),
  history: store.sessions.reduce((total, session) => total + session.history.length, 0)
});

const parseDatabaseTarget = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return {};
  }

  try {
    const parsed = new URL(connectionString);
    return {
      host: parsed.hostname || undefined,
      port: parsed.port || undefined,
      database: parsed.pathname.replace(/^\/+/, "") || undefined
    };
  } catch {
    return {};
  }
};

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  const checkedAt = new Date().toISOString();
  const backend = getStorageBackend();

  if (backend === "file") {
    const persistentDatabaseRequired = isPersistentDatabaseRequired();
    const stats = await fs.stat(dataFilePath).catch(() => null);
    const store = persistentDatabaseRequired ? null : await getStore();

    return {
      backend,
      checkedAt,
      healthy: !persistentDatabaseRequired,
      databaseUrlConfigured: false,
      warnings: persistentDatabaseRequired
        ? ["بيئة الإنتاج الحالية تتطلب PostgreSQL. التخزين المحلي غير صالح للنشر على Vercel."]
        : ["يعمل التطبيق حالياً على التخزين المحلي. هذا مناسب لخادم واحد وليس لتشغيل متعدد العقد."],
      error: persistentDatabaseRequired
        ? "DATABASE_URL is missing for a production-style deployment."
        : undefined,
      recordCounts: store ? buildRecordCounts(store) : undefined,
      file: {
        path: dataFilePath,
        exists: Boolean(stats),
        sizeBytes: stats?.size ?? 0,
        lastModifiedAt: stats?.mtime.toISOString()
      }
    };
  }

  const diagnostics: StorageDiagnostics = {
    backend,
    checkedAt,
    healthy: false,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    warnings: [],
    postgres: {
      ...parseDatabaseTarget(),
      connected: false,
      schemaReady: false,
      legacyTablePresent: false
    }
  };

  try {
    const pool = getPostgresPool();
    const connectionStartedAt = Date.now();
    const client = await pool.connect();

    try {
      const pingResult = await client.query<{ server_time: string }>(
        `SELECT NOW()::text AS server_time`
      );
      const tablesResult = await client.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = ANY($1::text[])
        `,
        [requiredTableNames]
      );
      const legacyResult = await client.query<{ exists: boolean }>(
        `
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'minibo_app_store'
          ) AS exists
        `
      );

      const existingTables = new Set(tablesResult.rows.map((row) => row.table_name));
      const missingTables = requiredTableNames.filter((tableName) => !existingTables.has(tableName));

      diagnostics.postgres = {
        ...diagnostics.postgres,
        connected: true,
        latencyMs: Date.now() - connectionStartedAt,
        serverTime: new Date(pingResult.rows[0]?.server_time ?? checkedAt).toISOString(),
        schemaReady: missingTables.length === 0,
        legacyTablePresent: legacyResult.rows[0]?.exists ?? false
      };

      if (missingTables.length > 0) {
        diagnostics.warnings.push(`جداول PostgreSQL الناقصة: ${missingTables.join(", ")}`);
      }

      if (diagnostics.postgres.legacyTablePresent) {
        diagnostics.warnings.push(
          "تم العثور على جدول legacy باسم minibo_app_store. يفضل التأكد من اكتمال الترحيل إلى الـ schema العلاقي."
        );
      }

      if (diagnostics.postgres.schemaReady) {
        const countsResult = await client.query<StorageRecordCounts>(
          `
            SELECT
              (SELECT COUNT(*)::int FROM minibo_brands) AS brands,
              (SELECT COUNT(*)::int FROM minibo_products) AS products,
              (SELECT COUNT(*)::int FROM minibo_shifts) AS shifts,
              (SELECT COUNT(*)::int FROM minibo_report_templates) AS "reportTemplates",
              (SELECT COUNT(*)::int FROM minibo_required_rows) AS "requiredRows",
              (SELECT COUNT(*)::int FROM minibo_users) AS users,
              (SELECT COUNT(*)::int FROM minibo_sessions) AS sessions,
              (SELECT COUNT(*)::int FROM minibo_session_rows) AS "sessionRows",
              (SELECT COUNT(*)::int FROM minibo_notes) AS notes,
              (SELECT COUNT(*)::int FROM minibo_history) AS history
          `
        );

        diagnostics.recordCounts = countsResult.rows[0];
      }

      diagnostics.healthy = diagnostics.postgres.connected && diagnostics.postgres.schemaReady;

      return diagnostics;
    } finally {
      client.release();
    }
  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : "تعذر فحص اتصال PostgreSQL";
    diagnostics.warnings.push("تعذر الاتصال بقاعدة PostgreSQL الحالية.");
    return diagnostics;
  }
}
