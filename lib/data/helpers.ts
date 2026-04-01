import { format } from "date-fns";
import type { MiniBoStore, Product, ProductionHistoryPoint, ProductionSession, RequiredRow, SessionRow } from "@/lib/types";

export const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const getProductById = (products: Product[], productId?: string) =>
  products.find((product) => product.id === productId);

export const calculateKg = (quantityCartons: number, conversionFactor: number) =>
  Number((quantityCartons * conversionFactor).toFixed(2));

export const getSessionTotals = (session: ProductionSession) => {
  const totalCartons = session.rows.reduce((sum, row) => sum + row.quantityCartons, 0);
  const totalKg = session.rows.reduce((sum, row) => sum + row.quantityKg, 0);

  return {
    totalCartons: Number(totalCartons.toFixed(2)),
    totalKg: Number(totalKg.toFixed(2))
  };
};

const extractDateParts = (locale: string) => {
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Cairo"
  });
  return formatter.formatToParts(new Date());
};

export const getCurrentDate = () => {
  const parts = extractDateParts("en");
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
};

export const getCurrentDateLabel = () =>
  new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "long",
    timeZone: "Africa/Cairo"
  }).format(new Date());

export const getSessionLabel = (store: MiniBoStore, session: ProductionSession) => {
  const shift = store.shifts.find((item) => item.id === session.shiftId);
  const brand = store.brands.find((item) => item.code === session.brandCode);
  return `${brand?.name ?? session.brandCode} - ${shift?.name ?? session.shiftId}`;
};

export const aggregateBrandTotals = (store: MiniBoStore) =>
  store.brands
    .map((brand) => {
      const sessions = store.sessions.filter((session) => session.brandCode === brand.code);
      const totals = sessions.reduce(
        (accumulator, session) => {
          const sessionTotals = getSessionTotals(session);
          accumulator.totalCartons += sessionTotals.totalCartons;
          accumulator.totalKg += sessionTotals.totalKg;
          return accumulator;
        },
        { totalCartons: 0, totalKg: 0 }
      );
      return {
        brand: brand.name,
        totalCartons: Number(totals.totalCartons.toFixed(2)),
        totalKg: Number(totals.totalKg.toFixed(2))
      };
    })
    .filter((item) => item.totalCartons > 0);

export const compareRequiredRows = (store: MiniBoStore) =>
  store.requiredRows.map((row: RequiredRow) => {
    const product = store.products.find((item) => item.code === row.productCode);
    const actualQty = product
      ? store.sessions.reduce((sum, session) => {
          const matchingRow = session.rows.find((sessionRow) => sessionRow.productId === product.id);
          return sum + (matchingRow?.quantityCartons ?? 0);
        }, 0)
      : row.actualQty;

    return {
      ...row,
      actualQty,
      variance: Number((actualQty - row.requiredQty).toFixed(2))
    };
  });

export const ensureTrailingEmptyRow = (rows: SessionRow[]) => {
  const lastRow = rows.at(-1);
  if (!lastRow || lastRow.productId || lastRow.quantityCartons > 0) {
    return [...rows, { id: createId("row"), quantityCartons: 0, quantityKg: 0 }];
  }
  return rows;
};

export const aggregateTopProducts = (store: MiniBoStore) => {
  const map = new Map<string, { productName: string; cartons: number; kg: number; brandCode: string }>();

  store.sessions.forEach((session) => {
    session.rows.forEach((row) => {
      if (!row.productId || row.quantityCartons <= 0) {
        return;
      }
      const product = getProductById(store.products, row.productId);
      if (!product) {
        return;
      }
      const current = map.get(product.id) ?? {
        productName: product.name,
        cartons: 0,
        kg: 0,
        brandCode: product.brandCode
      };
      current.cartons += row.quantityCartons;
      current.kg += row.quantityKg;
      map.set(product.id, current);
    });
  });

  return Array.from(map.values())
    .sort((left, right) => right.kg - left.kg)
    .slice(0, 5);
};

export const buildReportSummary = (store: MiniBoStore) =>
  store.reportTemplates.map((template) => ({
    ...template,
    productCount: store.products.filter(
      (product) => template.brandCodes.includes(product.brandCode) && (!template.filterStatus || product.status === template.filterStatus)
    ).length
  }));

export const getApprovalTable = (store: MiniBoStore, session: ProductionSession) => {
  const grouped = new Map<string, { productName: string; hours: Record<number, number>; total: number; notes: string[] }>();

  session.history.forEach((point: ProductionHistoryPoint) => {
    const product = getProductById(store.products, point.productId);
    if (!product) {
      return;
    }
    const hourNumber = Number(format(new Date(point.recordedAt), "H"));
    const current = grouped.get(point.productId) ?? {
      productName: product.name,
      hours: {},
      total: 0,
      notes: []
    };
    current.hours[hourNumber] = point.quantityCartons;
    current.total = Math.max(current.total, point.quantityCartons);
    grouped.set(point.productId, current);
  });

  session.notes.forEach((note) => {
    if (!note.productId) {
      return;
    }
    const current = grouped.get(note.productId);
    if (!current) {
      return;
    }
    current.notes.push(`${note.noteTime} ${note.noteText}`);
  });

  return Array.from(grouped.entries()).map(([productId, item]) => ({
    productId,
    ...item
  }));
};
