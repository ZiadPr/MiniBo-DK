"use client";

import { useMemo, useRef, useState } from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import toast from "react-hot-toast";
import {
  Alert,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import StorageStatusPanel from "@/components/admin/StorageStatusPanel";
import { useMiniBoStore } from "@/components/providers/MiniBoStoreProvider";
import type { ProductDraft, ProductImportResult, ProductStatus, UnitType } from "@/lib/types";

const initialDraft: ProductDraft = {
  name: "",
  code: "",
  unit: "كجم",
  conversionFactor: 1,
  brandCode: "TEMRY",
  status: "FR",
  subGroup: "",
  mainGroup: "",
  customGroup: ""
};

const templateHeaders = [
  "الصنف",
  "الكود",
  "الوحدة",
  "المعامل",
  "البراند",
  "الحالة",
  "مجموعة فرعية",
  "مجموعة رئيسية",
  "مجموعة مخصصة"
];

const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: { xs: 4, md: 5 },
  border: "1px solid rgba(31,111,92,0.08)"
} as const;

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const headerAliases: Record<string, keyof ProductDraft | "brand"> = {
  "الصنف": "name",
  "الكود": "code",
  "الوحدة": "unit",
  "المعامل": "conversionFactor",
  "البراند": "brand",
  "الحالة": "status",
  "مجموعة فرعية": "subGroup",
  "مجموعة رئيسية": "mainGroup",
  "مجموعة مخصصة": "customGroup"
};

export default function AdminOverview() {
  const { ready, loading, error, store, addProduct, importProducts, setProductActive } = useMiniBoStore();
  const [productDraft, setProductDraft] = useState<ProductDraft>(initialDraft);
  const [activeOnly, setActiveOnly] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ProductImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const freshProducts = useMemo(
    () => store.products.filter((product) => product.status === "FR").length,
    [store.products]
  );
  const frozenProducts = useMemo(
    () => store.products.filter((product) => product.status === "FZ").length,
    [store.products]
  );
  const visibleProducts = useMemo(
    () => store.products.filter((product) => (activeOnly ? product.isActive : true)),
    [activeOnly, store.products]
  );

  if (!ready || loading) {
    return <Typography>جارٍ تحميل لوحة الإدارة...</Typography>;
  }

  const handleSubmit = async () => {
    try {
      await addProduct(productDraft);
      setProductDraft({
        ...initialDraft,
        brandCode: store.brands[0]?.code ?? "TEMRY"
      });
      toast.success("تمت إضافة الصنف بنجاح");
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "تعذر إضافة الصنف");
    }
  };

  const handleToggleActive = async (productId: string, isActive: boolean) => {
    try {
      await setProductActive(productId, isActive);
      toast.success(isActive ? "تم تفعيل الصنف" : "تم تعطيل الصنف");
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : "تعذر تحديث حالة الصنف");
    }
  };

  const resolveBrandCode = (value: string) => {
    const trimmedValue = value.trim();
    const matchingBrand = store.brands.find(
      (brand) =>
        brand.code.toLowerCase() === trimmedValue.toLowerCase() ||
        brand.name.trim() === trimmedValue
    );
    return matchingBrand?.code ?? trimmedValue;
  };

  const buildTemplateFile = async () => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");

    worksheet.addRow(templateHeaders);
    worksheet.addRow([
      "تمري فريش فيليه 1كجم",
      "TM-FR-FILET-1",
      "كجم",
      1,
      "TEMRY",
      "FR",
      "FILET",
      "FILET",
      "Premium"
    ]);

    worksheet.getRow(1).font = { bold: true };
    worksheet.columns = templateHeaders.map((header) => ({
      header,
      key: header,
      width: 22
    }));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "minibo-products-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseExcelFile = async (file: File) => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("الملف لا يحتوي على أي Sheet");
    }

    const headerMap = new Map<number, keyof ProductDraft | "brand">();
    worksheet.getRow(1).eachCell((cell, columnNumber) => {
      const key = headerAliases[normalizeHeader(cell.value)];
      if (key) {
        headerMap.set(columnNumber, key);
      }
    });

    const products: ProductDraft[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const rowData: Partial<ProductDraft> & { brand?: string } = {};
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        const key = headerMap.get(columnNumber);
        if (!key) {
          return;
        }

        const rawValue = cell.value;
        const normalizedValue =
          typeof rawValue === "object" && rawValue && "text" in rawValue
            ? String(rawValue.text ?? "")
            : String(rawValue ?? "").trim();

        if (!normalizedValue) {
          return;
        }

        if (key === "conversionFactor") {
          rowData.conversionFactor = Number(normalizedValue);
          return;
        }

        if (key === "unit") {
          rowData.unit = normalizedValue === "عدد" ? "عدد" : "كجم";
          return;
        }

        if (key === "status") {
          rowData.status = normalizedValue as ProductStatus;
          return;
        }

        if (key === "brand") {
          rowData.brand = normalizedValue;
          return;
        }

        rowData[key] = normalizedValue;
      });

      if (!rowData.name && !rowData.code) {
        return;
      }

      products.push({
        name: rowData.name ?? "",
        code: rowData.code ?? "",
        unit: rowData.unit ?? "كجم",
        conversionFactor: rowData.conversionFactor ?? 1,
        brandCode: resolveBrandCode(rowData.brand ?? ""),
        status: rowData.status ?? "FR",
        subGroup: rowData.subGroup ?? "",
        mainGroup: rowData.mainGroup ?? "",
        customGroup: rowData.customGroup ?? ""
      });
    });

    return products;
  };

  const handleFileImport = async (file: File) => {
    try {
      setImporting(true);
      const parsedProducts = await parseExcelFile(file);
      if (parsedProducts.length === 0) {
        throw new Error("لم يتم العثور على أصناف صالحة داخل الملف");
      }

      const result = await importProducts(parsedProducts);
      setImportResult(result ?? null);
      toast.success("تم تنفيذ الاستيراد");
    } catch (importError) {
      toast.error(importError instanceof Error ? importError.message : "تعذر استيراد الملف");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        لوحة الإدارة
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={4}>
          <Paper elevation={0} sx={sectionPaperSx}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                إجمالي البراندات
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {store.brands.length}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} xl={4}>
          <Paper elevation={0} sx={sectionPaperSx}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                أصناف الفريش
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {freshProducts}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} xl={4}>
          <Paper elevation={0} sx={sectionPaperSx}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                أصناف المجمد
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {frozenProducts}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} xl={4}>
          <Paper elevation={0} sx={sectionPaperSx}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>
                إضافة صنف جديد
              </Typography>
              <TextField
                label="اسم الصنف"
                value={productDraft.name}
                onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                fullWidth
              />
              <TextField
                label="الكود"
                value={productDraft.code}
                onChange={(event) => setProductDraft((current) => ({ ...current, code: event.target.value }))}
                fullWidth
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="الوحدة"
                    value={productDraft.unit}
                    onChange={(event) =>
                      setProductDraft((current) => ({ ...current, unit: event.target.value as UnitType }))
                    }
                    fullWidth
                  >
                    <MenuItem value="كجم">كجم</MenuItem>
                    <MenuItem value="عدد">عدد</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    type="number"
                    label="المعامل"
                    value={productDraft.conversionFactor}
                    onChange={(event) =>
                      setProductDraft((current) => ({
                        ...current,
                        conversionFactor: Number(event.target.value)
                      }))
                    }
                    fullWidth
                  />
                </Grid>
              </Grid>
              <TextField
                select
                label="البراند"
                value={productDraft.brandCode}
                onChange={(event) => setProductDraft((current) => ({ ...current, brandCode: event.target.value }))}
                fullWidth
              >
                {store.brands.map((brand) => (
                  <MenuItem key={brand.code} value={brand.code}>
                    {brand.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="الحالة"
                value={productDraft.status}
                onChange={(event) =>
                  setProductDraft((current) => ({
                    ...current,
                    status: event.target.value as ProductStatus
                  }))
                }
                fullWidth
              >
                <MenuItem value="FR">FR</MenuItem>
                <MenuItem value="FZ">FZ</MenuItem>
                <MenuItem value="ALL">ALL</MenuItem>
                <MenuItem value="SLH">SLH</MenuItem>
              </TextField>
              <TextField
                label="المجموعة الرئيسية"
                value={productDraft.mainGroup}
                onChange={(event) => setProductDraft((current) => ({ ...current, mainGroup: event.target.value }))}
                fullWidth
              />
              <TextField
                label="المجموعة الفرعية"
                value={productDraft.subGroup}
                onChange={(event) => setProductDraft((current) => ({ ...current, subGroup: event.target.value }))}
                fullWidth
              />
              <TextField
                label="مجموعة مخصصة"
                value={productDraft.customGroup}
                onChange={(event) => setProductDraft((current) => ({ ...current, customGroup: event.target.value }))}
                fullWidth
              />
              <Button variant="contained" onClick={() => void handleSubmit()}>
                حفظ الصنف
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={8}>
          <Stack spacing={2}>
            <Paper elevation={0} sx={sectionPaperSx}>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  استيراد جماعي من Excel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  الأعمدة المدعومة: الصنف، الكود، الوحدة، المعامل، البراند، الحالة، مجموعة فرعية، مجموعة رئيسية، مجموعة مخصصة.
                </Typography>

                <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                  <Button
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon />}
                    onClick={() => void buildTemplateFile()}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    تحميل القالب
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<UploadFileOutlinedIcon />}
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    {importing ? "جارٍ الاستيراد..." : "استيراد ملف"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFileImport(file);
                      }
                    }}
                  />
                </Stack>

                {importResult ? (
                  <Stack spacing={1}>
                    <Alert severity="success">
                      أضيف {importResult.added} • حُدث {importResult.updated} • تُرك {importResult.skipped}
                    </Alert>
                    {importResult.errors.length ? (
                      <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: "rgba(198,93,0,0.08)" }}>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            ملاحظات الاستيراد
                          </Typography>
                          {importResult.errors.slice(0, 10).map((item) => (
                            <Typography key={`${item.row}-${item.reason}`} variant="body2">
                              السطر {item.row}: {item.reason}
                            </Typography>
                          ))}
                        </Stack>
                      </Paper>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            </Paper>

            <Paper elevation={0} sx={sectionPaperSx}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", md: "center" }}
                  gap={1.5}
                >
                  <Typography variant="h6" fontWeight={700}>
                    قاعدة الأصناف
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />}
                    label="عرض النشطة فقط"
                    sx={{ m: 0 }}
                  />
                </Stack>

                <TableContainer sx={{ borderRadius: 4, border: "1px solid rgba(31,111,92,0.08)", overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 760 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>الصنف</TableCell>
                        <TableCell>الكود</TableCell>
                        <TableCell>البراند</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>المعامل</TableCell>
                        <TableCell>التفعيل</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.code}</TableCell>
                          <TableCell>{product.brandCode}</TableCell>
                          <TableCell>
                            <Chip
                              label={product.status}
                              size="small"
                              color={product.status === "FR" ? "success" : product.status === "FZ" ? "info" : "default"}
                            />
                          </TableCell>
                          <TableCell>{product.conversionFactor}</TableCell>
                          <TableCell>
                            <Switch
                              checked={product.isActive}
                              onChange={(event) => void handleToggleActive(product.id, event.target.checked)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} xl={6}>
          <Paper elevation={0} sx={sectionPaperSx}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>
                المستخدمون والأدوار
              </Typography>
              {store.users.map((user) => (
                <Paper key={user.id} elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: "rgba(31,111,92,0.05)" }}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={700}>{user.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.username} • {user.role}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.permissions.slice(0, 4).join("، ")}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={6}>
          <Stack spacing={2}>
            <StorageStatusPanel />

            <Paper elevation={0} sx={sectionPaperSx}>
              <Stack spacing={1.5}>
                <Typography variant="h6" fontWeight={700}>
                  جاهزية الاستخدام
                </Typography>
                <Alert severity="success">
                  الاستيراد الجماعي للأصناف جاهز من Excel مع تحديث أو إضافة حسب الكود.
                </Alert>
                <Alert severity="info">
                  إذا كان الكود موجوداً سيُحدَّث الصنف، وإذا كان جديداً فسيُضاف تلقائياً.
                </Alert>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
