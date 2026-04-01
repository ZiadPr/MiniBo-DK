import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addNoteMutation,
  addProductMutation,
  addRowMutation,
  approveSessionMutation,
  deleteRowMutation,
  ensureSessionMutation,
  importProductsMutation,
  setProductActiveMutation,
  submitSessionMutation,
  updateRowProductMutation,
  updateRowQuantityMutation
} from "@/lib/server/store";

const productDraftSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  unit: z.enum(["كجم", "عدد"]),
  conversionFactor: z.coerce.number().positive(),
  brandCode: z.string().min(1),
  status: z.enum(["FR", "FZ", "ALL", "SLH"]),
  subGroup: z.string().min(1),
  mainGroup: z.string().min(1),
  customGroup: z.string().optional()
});

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ensureSession"),
    shiftId: z.string().min(1),
    brandCode: z.string().min(1),
    reportType: z.enum(["fresh", "frozen"])
  }),
  z.object({
    action: z.literal("updateRowProduct"),
    sessionId: z.string().min(1),
    rowId: z.string().min(1),
    productId: z.string().min(1)
  }),
  z.object({
    action: z.literal("updateRowQuantity"),
    sessionId: z.string().min(1),
    rowId: z.string().min(1),
    quantityCartons: z.coerce.number().min(0)
  }),
  z.object({
    action: z.literal("addRow"),
    sessionId: z.string().min(1)
  }),
  z.object({
    action: z.literal("deleteRow"),
    sessionId: z.string().min(1),
    rowId: z.string().min(1)
  }),
  z.object({
    action: z.literal("addNote"),
    sessionId: z.string().min(1),
    note: z.object({
      productId: z.string().optional(),
      quantityKg: z.coerce.number().optional(),
      noteTime: z.string().min(1),
      noteText: z.string().min(1)
    })
  }),
  z.object({
    action: z.literal("submitSession"),
    sessionId: z.string().min(1)
  }),
  z.object({
    action: z.literal("approveSession"),
    sessionId: z.string().min(1)
  }),
  z.object({
    action: z.literal("addProduct"),
    product: productDraftSchema
  }),
  z.object({
    action: z.literal("importProducts"),
    products: z.array(productDraftSchema)
  }),
  z.object({
    action: z.literal("setProductActive"),
    productId: z.string().min(1),
    isActive: z.boolean()
  })
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = mutationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    switch (parsed.data.action) {
      case "ensureSession":
        return NextResponse.json(
          await ensureSessionMutation({
            shiftId: parsed.data.shiftId,
            brandCode: parsed.data.brandCode,
            reportType: parsed.data.reportType
          })
        );
      case "updateRowProduct":
        return NextResponse.json(await updateRowProductMutation(parsed.data));
      case "updateRowQuantity":
        return NextResponse.json(await updateRowQuantityMutation(parsed.data));
      case "addRow":
        return NextResponse.json(await addRowMutation(parsed.data));
      case "deleteRow":
        return NextResponse.json(await deleteRowMutation(parsed.data));
      case "addNote":
        return NextResponse.json(await addNoteMutation(parsed.data));
      case "submitSession":
        return NextResponse.json(await submitSessionMutation(parsed.data));
      case "approveSession":
        return NextResponse.json(await approveSessionMutation(parsed.data));
      case "addProduct":
        return NextResponse.json(await addProductMutation(parsed.data));
      case "importProducts":
        return NextResponse.json(await importProductsMutation(parsed.data));
      case "setProductActive":
        return NextResponse.json(await setProductActiveMutation(parsed.data));
      default:
        return NextResponse.json({ message: "العملية غير مدعومة" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
    return NextResponse.json({ message }, { status: 500 });
  }
}
