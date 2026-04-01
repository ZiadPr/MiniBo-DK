import { NextResponse } from "next/server";
import { getStorageDiagnostics } from "@/lib/server/storage-diagnostics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const diagnostics = await getStorageDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر فحص حالة التخزين";

    return NextResponse.json(
      {
        backend: process.env.DATABASE_URL ? "postgres" : "file",
        checkedAt: new Date().toISOString(),
        healthy: false,
        databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
        warnings: [message],
        error: message
      },
      { status: 500 }
    );
  }
}
