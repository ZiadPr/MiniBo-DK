import { access } from "fs/promises";
import path from "path";
import ExcelJS from "exceljs";
import { getApprovalTable, getSessionLabel, getSessionTotals } from "@/lib/data/helpers";
import { getStore } from "@/lib/server/store";

type ApprovalExportRow = {
  productId: string;
  productName: string;
  hours: Record<number, number>;
  total: number;
  notes: string[];
};

type ApprovalExportData = {
  sessionId: string;
  label: string;
  date: string;
  status: string;
  approvers: string[];
  hours: number[];
  rows: ApprovalExportRow[];
  totalCartons: number;
  totalKg: number;
};

const arabicRegex = /[\u0600-\u06FF]/;

const formatPdfText = (text: string) => {
  if (!text || !arabicRegex.test(text)) {
    return text;
  }

  const bidiModule = require("bidi-js");
  const bidiFactory =
    (typeof bidiModule === "function" ? bidiModule : bidiModule.default) as () => {
      getEmbeddingLevels: (inputText: string, direction?: "rtl" | "ltr") => {
        levels: Uint8Array;
        paragraphs: Array<{ start: number; end: number; level: number }>;
      };
      getReorderSegments: (
        inputText: string,
        embeddingLevels: { levels: Uint8Array; paragraphs: Array<{ start: number; end: number; level: number }> },
        start?: number,
        end?: number
      ) => Array<[number, number]>;
      getMirroredCharactersMap: (
        inputText: string,
        embeddingLevels: { levels: Uint8Array; paragraphs: Array<{ start: number; end: number; level: number }> },
        start?: number,
        end?: number
      ) => Map<number, string>;
    };
  const reshaperModule = require("arabic-persian-reshaper") as {
    ArabicShaper?: {
      convertArabic: (inputText: string) => string;
    };
    default?: {
      ArabicShaper?: {
        convertArabic: (inputText: string) => string;
      };
    };
  };
  const reshaper = reshaperModule.ArabicShaper
    ? reshaperModule
    : reshaperModule.default ?? reshaperModule;
  const bidi = bidiFactory();
  const arabicShaper = reshaper.ArabicShaper;
  if (!arabicShaper) {
    return text;
  }
  const shaped = arabicShaper.convertArabic(text);
  const embeddingLevels = bidi.getEmbeddingLevels(shaped, "rtl");
  const chars = Array.from(shaped);
  const flips = bidi.getReorderSegments(shaped, embeddingLevels);

  flips.forEach(([start, end]) => {
    const segment = chars.slice(start, end + 1).reverse();
    chars.splice(start, end - start + 1, ...segment);
  });

  const mirrored = bidi.getMirroredCharactersMap(shaped, embeddingLevels);
  mirrored.forEach((char, index) => {
    chars[index] = char;
  });

  return chars.join("");
};

const resolvePdfFontPath = async () => {
  const bundledFontPath = path.join(process.cwd(), "public", "fonts", "Amiri-Regular.ttf");
  const candidatePaths = [
    process.env.PDF_ARABIC_FONT_PATH,
    bundledFontPath,
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\Tahoma.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
  ].filter(Boolean) as string[];

  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      continue;
    }
  }

  return null;
};

export async function getApprovalExportData(sessionId: string): Promise<ApprovalExportData> {
  const store = await getStore();
  const session = store.sessions.find((item) => item.id === sessionId);

  if (!session) {
    throw new Error("الجلسة غير موجودة");
  }

  const rows = getApprovalTable(store, session);
  const hours = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.hours).map((hour) => Number(hour))))
  ).sort((left, right) => left - right);
  const totals = getSessionTotals(session);

  return {
    sessionId: session.id,
    label: getSessionLabel(store, session),
    date: session.sessionDate,
    status: session.status,
    approvers: session.approvers,
    hours,
    rows,
    totalCartons: totals.totalCartons,
    totalKg: totals.totalKg
  };
}

export async function buildApprovalExcelBuffer(sessionId: string) {
  const report = await getApprovalExportData(sessionId);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Approval");

  worksheet.views = [{ state: "frozen", ySplit: 6, rightToLeft: true }];

  worksheet.addRow(["MiniBo Systems"]);
  worksheet.addRow(["تقرير الاعتماد"]);
  worksheet.addRow(["الجلسة", report.label]);
  worksheet.addRow(["التاريخ", report.date]);
  worksheet.addRow(["المعتمدون", report.approvers.join("، ")]);
  worksheet.addRow([]);

  const headers = ["المنتج", ...report.hours.map((hour) => `${hour}:00`), "الإجمالي", "ملاحظات"];
  worksheet.addRow(headers);

  report.rows.forEach((row) => {
    worksheet.addRow([
      row.productName,
      ...report.hours.map((hour) => row.hours[hour] ?? ""),
      row.total,
      row.notes.join(" | ")
    ]);
  });

  worksheet.addRow([]);
  worksheet.addRow(["إجمالي العبوات", report.totalCartons]);
  worksheet.addRow(["إجمالي الوزن كجم", report.totalKg]);

  worksheet.getRow(1).font = { bold: true, size: 16 };
  worksheet.getRow(2).font = { bold: true, size: 14 };
  worksheet.getRow(7).font = { bold: true };

  worksheet.columns = headers.map((header, index) => ({
    header,
    key: `${index}`,
    width: index === 0 ? 32 : index === headers.length - 1 ? 42 : 14
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const drawPdfTableHeader = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  widths: { product: number; hour: number; total: number; notes: number },
  hours: number[]
) => {
  let cursorX = x;
  const cells = [
    { text: "المنتج", width: widths.product },
    ...hours.map((hour) => ({ text: `${hour}:00`, width: widths.hour })),
    { text: "الإجمالي", width: widths.total },
    { text: "ملاحظات", width: widths.notes }
  ];

  cells.forEach((cell) => {
    doc.rect(cursorX, y, cell.width, 24).stroke("#C7D8D2");
    doc.text(formatPdfText(cell.text), cursorX + 4, y + 7, {
      width: cell.width - 8,
      align: "center"
    });
    cursorX += cell.width;
  });
};

const drawPdfRow = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  widths: { product: number; hour: number; total: number; notes: number },
  hours: number[],
  row: ApprovalExportRow
) => {
  let cursorX = x;
  const cells = [
    { text: row.productName, width: widths.product, align: "right" as const },
    ...hours.map((hour) => ({ text: String(row.hours[hour] ?? "-"), width: widths.hour, align: "center" as const })),
    { text: String(row.total), width: widths.total, align: "center" as const },
    { text: row.notes.join(" | ") || "-", width: widths.notes, align: "right" as const }
  ];

  const height = 28;
  cells.forEach((cell) => {
    doc.rect(cursorX, y, cell.width, height).stroke("#E0E7E4");
    doc.text(formatPdfText(cell.text), cursorX + 4, y + 8, {
      width: cell.width - 8,
      align: cell.align
    });
    cursorX += cell.width;
  });

  return height;
};

export async function buildApprovalPdfBuffer(sessionId: string) {
  const report = await getApprovalExportData(sessionId);
  const fontPath = await resolvePdfFontPath();
  const PDFDocumentModule = require("pdfkit");
  const PDFDocument =
    (typeof PDFDocumentModule === "function" ? PDFDocumentModule : PDFDocumentModule.default) as new (
      options?: PDFKit.PDFDocumentOptions
    ) => PDFKit.PDFDocument;

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36
  });

  const chunks: Buffer[] = [];
  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  if (fontPath) {
    doc.font(fontPath);
  }

  doc.fontSize(18).text(formatPdfText("MiniBo Systems"), { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(16).text(formatPdfText("تقرير الاعتماد"), { align: "center" });
  doc.moveDown(0.6);

  doc.fontSize(11);
  doc.text(formatPdfText(`الجلسة: ${report.label}`), { align: "right" });
  doc.text(formatPdfText(`التاريخ: ${report.date}`), { align: "right" });
  doc.text(formatPdfText(`الحالة: ${report.status}`), { align: "right" });
  doc.text(formatPdfText(`المعتمدون: ${report.approvers.join("، ")}`), { align: "right" });
  doc.moveDown(0.8);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = {
    product: 200,
    notes: 170,
    total: 70,
    hour: Math.max(42, Math.floor((pageWidth - 200 - 170 - 70) / Math.max(report.hours.length, 1)))
  };

  let y = doc.y;
  const startX = doc.page.margins.left;
  const tableBottomLimit = doc.page.height - doc.page.margins.bottom - 70;

  drawPdfTableHeader(doc, startX, y, widths, report.hours);
  y += 24;

  report.rows.forEach((row) => {
    if (y + 30 > tableBottomLimit) {
      doc.addPage({ size: "A4", layout: "landscape", margin: 36 });
      if (fontPath) {
        doc.font(fontPath);
      }
      y = doc.page.margins.top;
      drawPdfTableHeader(doc, startX, y, widths, report.hours);
      y += 24;
    }

    y += drawPdfRow(doc, startX, y, widths, report.hours, row);
  });

  y += 18;
  doc.fontSize(12).text(formatPdfText(`إجمالي العبوات: ${report.totalCartons}`), startX, y, {
    align: "right"
  });
  doc.text(formatPdfText(`إجمالي الوزن كجم: ${report.totalKg}`), startX, y + 18, {
    align: "right"
  });

  doc.end();
  return bufferPromise;
}

export const buildApprovalFilename = (sessionId: string, extension: "xlsx" | "pdf") =>
  `approval-${path.basename(sessionId)}.${extension}`;
