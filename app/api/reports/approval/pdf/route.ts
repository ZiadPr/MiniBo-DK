import { NextResponse } from "next/server";
import { z } from "zod";
import { buildApprovalFilename, buildApprovalPdfBuffer } from "@/lib/server/approval-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  sessionId: z.string().min(1)
});

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({
      sessionId: searchParams.get("sessionId")
    });

    if (!parsed.success) {
      return NextResponse.json({ message: "sessionId مطلوب" }, { status: 400 });
    }

    const buffer = await buildApprovalPdfBuffer(parsed.data.sessionId);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildApprovalFilename(parsed.data.sessionId, "pdf")}"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء ملف PDF";
    return NextResponse.json({ message }, { status: 500 });
  }
}
