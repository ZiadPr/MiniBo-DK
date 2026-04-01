import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/server/store";

const querySchema = z.object({
  q: z.string().optional().default(""),
  brand: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    brand: searchParams.get("brand") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? 20
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "معاملات البحث غير صالحة" }, { status: 400 });
  }

  const { q, brand, status, limit } = parsed.data;
  const normalizedQuery = q.trim().toLowerCase();
  const store = await getStore();

  const results = store.products
    .filter((product) => product.isActive)
    .filter((product) => (!brand ? true : product.brandCode === brand))
    .filter((product) => (!status ? true : product.status === status))
    .filter((product) => {
      if (!normalizedQuery) {
        return true;
      }
      return product.name.toLowerCase().includes(normalizedQuery) || product.code.toLowerCase().includes(normalizedQuery);
    })
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      unit: product.unit,
      conversionFactor: product.conversionFactor,
      brandCode: product.brandCode,
      status: product.status,
      subGroup: product.subGroup,
      mainGroup: product.mainGroup
    }));

  return NextResponse.json(results);
}
