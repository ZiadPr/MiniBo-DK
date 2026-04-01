"use client";

import { useEffect, useMemo, useState } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import {
  Alert,
  Button,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import toast from "react-hot-toast";
import ProductSearch from "@/components/entry/ProductSearch";
import { useMiniBoStore } from "@/components/providers/MiniBoStoreProvider";
import { getCurrentDate, getProductById, getSessionTotals } from "@/lib/data/helpers";
import type { ReportType } from "@/lib/types";

const reportTypes: Array<{ id: ReportType; label: string; status: "FR" | "FZ" }> = [
  { id: "fresh", label: "تقرير الفريش", status: "FR" },
  { id: "frozen", label: "تقرير المجمد", status: "FZ" }
];

const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: { xs: 4, md: 5 },
  border: "1px solid rgba(31,111,92,0.08)"
} as const;

export default function EntryWorkspace() {
  const {
    ready,
    loading,
    error,
    store,
    ensureSession,
    updateRowProduct,
    updateRowQuantity,
    addRow,
    deleteRow,
    addNote,
    submitSession
  } = useMiniBoStore();

  const [selectedShiftId, setSelectedShiftId] = useState("shift-morning");
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("fresh");
  const [selectedBrandCode, setSelectedBrandCode] = useState("TEMRY");
  const [notesOpen, setNotesOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [noteProductId, setNoteProductId] = useState("");
  const [noteTime, setNoteTime] = useState("10:00");
  const [noteText, setNoteText] = useState("");
  const [noteQty, setNoteQty] = useState("0");

  const runSessionMutation = async (
    task: () => Promise<void>,
    options?: { successMessage?: string }
  ) => {
    try {
      setSaveState("saving");
      await task();
      setSaveState("saved");
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
    } catch (mutationError) {
      setSaveState("idle");
      toast.error(mutationError instanceof Error ? mutationError.message : "تعذر حفظ التعديل");
    }
  };

  const report = reportTypes.find((item) => item.id === selectedReportType) ?? reportTypes[0];

  const availableBrands = useMemo(() => {
    const shift = store.shifts.find((item) => item.id === selectedShiftId);
    const template = store.reportTemplates.find((item) => item.id === selectedReportType);
    if (!shift || !template) {
      return [];
    }
    return store.brands.filter(
      (brand) => shift.allowedBrandCodes.includes(brand.code) && template.brandCodes.includes(brand.code)
    );
  }, [selectedReportType, selectedShiftId, store.brands, store.reportTemplates, store.shifts]);

  useEffect(() => {
    if (availableBrands.length && !availableBrands.some((brand) => brand.code === selectedBrandCode)) {
      setSelectedBrandCode(availableBrands[0].code);
    }
  }, [availableBrands, selectedBrandCode]);

  const session = useMemo(() => {
    if (!ready || !selectedBrandCode) {
      return null;
    }
    const currentSession = store.sessions.find(
      (item) =>
        item.shiftId === selectedShiftId &&
        item.brandCode === selectedBrandCode &&
        item.reportType === selectedReportType &&
        item.sessionDate === getCurrentDate()
    );
    return currentSession ?? null;
  }, [ready, selectedBrandCode, selectedReportType, selectedShiftId, store.sessions]);

  useEffect(() => {
    if (ready && selectedBrandCode && !session) {
      void ensureSession(selectedShiftId, selectedBrandCode, selectedReportType);
    }
  }, [ensureSession, ready, selectedBrandCode, selectedReportType, selectedShiftId, session]);

  const totals = session ? getSessionTotals(session) : { totalCartons: 0, totalKg: 0 };

  if (!ready || !session || loading) {
    return <Typography>جارٍ تجهيز جلسة الإدخال...</Typography>;
  }

  const selectedProductIds = session.rows.map((row) => row.productId).filter(Boolean) as string[];

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        لوحة إدخال الإنتاج
      </Typography>

      <Paper elevation={0} sx={sectionPaperSx}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} xl={4}>
            <TextField
              select
              fullWidth
              label="الوردية"
              value={selectedShiftId}
              onChange={(event) => setSelectedShiftId(event.target.value)}
            >
              {store.shifts.map((shift) => (
                <MenuItem key={shift.id} value={shift.id}>
                  {shift.name} ({shift.startTime} - {shift.endTime})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} xl={8}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {reportTypes.map((item) => (
                <Chip
                  key={item.id}
                  clickable
                  color={selectedReportType === item.id ? "primary" : "default"}
                  label={item.label}
                  onClick={() => setSelectedReportType(item.id)}
                  sx={{ height: 40 }}
                />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {availableBrands.map((brand) => (
                <Chip
                  key={brand.code}
                  clickable
                  label={`${brand.icon} ${brand.name}`}
                  onClick={() => setSelectedBrandCode(brand.code)}
                  sx={{
                    height: 42,
                    bgcolor: selectedBrandCode === brand.code ? brand.color : "rgba(31,111,92,0.05)",
                    color: selectedBrandCode === brand.code ? "#fff" : "text.primary"
                  }}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={sectionPaperSx}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "flex-start" }}
            gap={2}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700}>
                {store.brands.find((brand) => brand.code === selectedBrandCode)?.name} • {report.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                `Alt + سهم لأسفل` لفتح البحث داخل خلية الصنف.
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ width: { xs: "100%", lg: "auto" } }}
            >
              <Chip
                icon={<SaveOutlinedIcon />}
                label={
                  saveState === "saving"
                    ? "جارٍ الحفظ..."
                    : saveState === "saved"
                      ? "تم الحفظ"
                      : "في الانتظار"
                }
                color={saveState === "saved" ? "success" : "default"}
                variant="outlined"
              />
              <Button
                variant="outlined"
                startIcon={<NotesOutlinedIcon />}
                onClick={() => setNotesOpen(true)}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                ملاحظات
              </Button>
              <Button
                variant="contained"
                startIcon={<SendOutlinedIcon />}
                onClick={() =>
                  void runSessionMutation(() => submitSession(session.id), {
                    successMessage: "تم تقديم الجلسة للاعتماد"
                  })
                }
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                تقديم للاعتماد
              </Button>
            </Stack>
          </Stack>

          <TableContainer sx={{ borderRadius: 4, border: "1px solid rgba(31,111,92,0.08)", overflowX: "auto" }}>
            <Table sx={{ minWidth: 920 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell sx={{ minWidth: 280 }}>اسم الصنف / الكود</TableCell>
                  <TableCell align="center">الوحدة</TableCell>
                  <TableCell align="center">الكمية</TableCell>
                  <TableCell align="center">المعامل</TableCell>
                  <TableCell align="center">الوزن</TableCell>
                  <TableCell align="center">حذف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {session.rows.map((row, index) => {
                  const product = getProductById(store.products, row.productId);
                  const rowColor = product?.status === "FR" ? "rgba(46, 125, 50, 0.05)" : "rgba(2, 119, 189, 0.05)";

                  return (
                    <TableRow key={row.id} sx={{ bgcolor: product ? rowColor : "transparent" }}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <ProductSearch
                          brandCode={selectedBrandCode}
                          status={report.status}
                          selectedProductIds={selectedProductIds.filter((item) => item !== row.productId)}
                          value={product ? `${product.name} • ${product.code}` : undefined}
                          onSelect={(productId) =>
                            void runSessionMutation(() => updateRowProduct(session.id, row.id, productId))
                          }
                        />
                      </TableCell>
                      <TableCell align="center">{product?.unit ?? "-"}</TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={row.quantityCartons}
                          onChange={(event) =>
                            void runSessionMutation(() =>
                              updateRowQuantity(session.id, row.id, Number(event.target.value))
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void runSessionMutation(() => addRow(session.id));
                            }
                          }}
                          inputProps={{ min: 0, step: 1 }}
                          sx={{ minWidth: 96 }}
                        />
                      </TableCell>
                      <TableCell align="center">{product?.conversionFactor ?? "-"}</TableCell>
                      <TableCell align="center">{row.quantityKg.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          disabled={!row.productId && row.quantityCartons === 0}
                          onClick={() => void runSessionMutation(() => deleteRow(session.id, row.id))}
                        >
                          <DeleteOutlineOutlinedIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            gap={1.5}
          >
            <Button
              startIcon={<AddOutlinedIcon />}
              onClick={() => void runSessionMutation(() => addRow(session.id))}
              sx={{ alignSelf: { xs: "stretch", md: "flex-start" } }}
            >
              إضافة صف
            </Button>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={`إجمالي العبوات: ${totals.totalCartons.toFixed(0)}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`إجمالي الوزن: ${totals.totalKg.toFixed(2)} كجم`}
                color="secondary"
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Alert severity="info">
        الوزن يُحسب من كمية العبوات × معامل التحويل لكل صنف، والتغييرات تُحفظ مباشرة داخل الجلسة الحالية.
      </Alert>

      <Drawer
        anchor="left"
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420, md: 460 },
            maxWidth: "100%",
            p: { xs: 2, sm: 3 }
          }
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            ملاحظات الإنتاج
          </Typography>
          <Divider />

          <TextField
            select
            label="الصنف"
            value={noteProductId}
            onChange={(event) => setNoteProductId(event.target.value)}
            fullWidth
          >
            {session.rows
              .filter((row) => row.productId)
              .map((row) => {
                const product = getProductById(store.products, row.productId);
                if (!product) {
                  return null;
                }
                return (
                  <MenuItem key={row.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                );
              })}
          </TextField>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="الساعة" value={noteTime} onChange={(event) => setNoteTime(event.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الكمية كجم"
                type="number"
                value={noteQty}
                onChange={(event) => setNoteQty(event.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
          <TextField
            label="الملاحظة"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
          <Button
            variant="contained"
            onClick={() => {
              if (!noteText.trim()) {
                return;
              }
              void runSessionMutation(
                () =>
                  addNote(session.id, {
                    productId: noteProductId || undefined,
                    quantityKg: Number(noteQty || "0"),
                    noteTime,
                    noteText
                  }),
                {
                  successMessage: "تمت إضافة الملاحظة"
                }
              ).then(() => {
                setNoteText("");
                setNoteQty("0");
                setNoteProductId("");
              });
            }}
          >
            إضافة الملاحظة
          </Button>

          <Divider />

          <Stack spacing={1.5}>
            {session.notes.length === 0 ? <Typography color="text.secondary">لا توجد ملاحظات حالياً.</Typography> : null}
            {session.notes.map((note) => {
              const product = getProductById(store.products, note.productId);
              return (
                <Paper key={note.id} elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: "rgba(31,111,92,0.05)" }}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {note.noteTime} • {product?.name ?? "ملاحظة عامة"}
                    </Typography>
                    <Typography variant="body2">{note.noteText}</Typography>
                    {note.quantityKg ? (
                      <Typography variant="caption" color="text.secondary">
                        كمية مرتبطة: {note.quantityKg} كجم
                      </Typography>
                    ) : null}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      </Drawer>
    </Stack>
  );
}
