"use client";

import { useMemo, useState } from "react";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import {
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import toast from "react-hot-toast";
import { useMiniBoStore } from "@/components/providers/MiniBoStoreProvider";
import { getApprovalTable, getSessionLabel } from "@/lib/data/helpers";

const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: { xs: 4, md: 5 },
  border: "1px solid rgba(31,111,92,0.08)"
} as const;

export default function ApprovalOverview() {
  const { ready, loading, error, store, approveSession } = useMiniBoStore();
  const [selectedSessionId, setSelectedSessionId] = useState("session-temry-morning");
  const [downloading, setDownloading] = useState<null | "excel" | "pdf">(null);

  const session = useMemo(
    () => store.sessions.find((item) => item.id === selectedSessionId) ?? store.sessions[0],
    [selectedSessionId, store.sessions]
  );

  const approvalRows = session ? getApprovalTable(store, session) : [];
  const hours = Array.from(
    new Set(approvalRows.flatMap((row) => Object.keys(row.hours).map((hour) => Number(hour))))
  ).sort((left, right) => left - right);

  if (!ready || !session || loading) {
    return <Typography>جارٍ تحميل جلسات الاعتماد...</Typography>;
  }

  const downloadReport = async (format: "excel" | "pdf") => {
    try {
      setDownloading(format);
      const response = await fetch(`/api/reports/approval/${format}?sessionId=${encodeURIComponent(session.id)}`);
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? `تعذر تنزيل ملف ${format.toUpperCase()}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `approval-${session.id}.${format === "excel" ? "xlsx" : "pdf"}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(format === "excel" ? "تم تنزيل Excel" : "تم تنزيل PDF");
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : "تعذر تنزيل التقرير");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        الاعتماد والطباعة
      </Typography>

      {error ? <Typography color="error">{error}</Typography> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} xl={4}>
          <Paper elevation={0} sx={sectionPaperSx}>
            <Stack spacing={1.5}>
              <Typography variant="h6" fontWeight={700}>
                الجلسات المتاحة
              </Typography>
              {store.sessions.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  onClick={() => setSelectedSessionId(item.id)}
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    cursor: "pointer",
                    border: item.id === session.id ? "1px solid rgba(31,111,92,0.35)" : "1px solid rgba(31,111,92,0.08)",
                    bgcolor: item.id === session.id ? "rgba(31,111,92,0.05)" : "transparent"
                  }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      gap={1}
                    >
                      <Typography fontWeight={700}>{getSessionLabel(store, item)}</Typography>
                      <Chip
                        label={
                          item.status === "approved"
                            ? "معتمد"
                            : item.status === "submitted"
                              ? "بانتظار الاعتماد"
                              : "مسودة"
                        }
                        color={item.status === "approved" ? "success" : item.status === "submitted" ? "warning" : "default"}
                        size="small"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      المعتمدون: {item.approvers.join("، ")}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={8}>
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
                    جدول الاعتمادية الجاهز للطباعة
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getSessionLabel(store, session)} • {session.sessionDate}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    variant="outlined"
                    startIcon={<TableViewOutlinedIcon />}
                    disabled={downloading !== null}
                    onClick={() => void downloadReport("excel")}
                  >
                    {downloading === "excel" ? "جارٍ التصدير..." : "Excel"}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfOutlinedIcon />}
                    disabled={downloading !== null}
                    onClick={() => void downloadReport("pdf")}
                  >
                    {downloading === "pdf" ? "جارٍ التصدير..." : "PDF"}
                  </Button>
                  <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
                    طباعة
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<FactCheckOutlinedIcon />}
                    disabled={session.status === "approved"}
                    onClick={async () => {
                      try {
                        await approveSession(session.id);
                        toast.success("تم اعتماد الجلسة");
                      } catch (approveError) {
                        toast.error(approveError instanceof Error ? approveError.message : "تعذر اعتماد الجلسة");
                      }
                    }}
                  >
                    اعتماد
                  </Button>
                </Stack>
              </Stack>

              <Divider />

              <TableContainer sx={{ borderRadius: 4, border: "1px solid rgba(31,111,92,0.08)", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 860 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>المنتج</TableCell>
                      {hours.map((hour) => (
                        <TableCell key={hour} align="center">
                          {hour}:00
                        </TableCell>
                      ))}
                      <TableCell align="center">الإجمالي</TableCell>
                      <TableCell sx={{ minWidth: 220 }}>ملاحظات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvalRows.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell>{row.productName}</TableCell>
                        {hours.map((hour) => (
                          <TableCell key={hour} align="center">
                            {row.hours[hour] ?? "-"}
                          </TableCell>
                        ))}
                        <TableCell align="center">{row.total}</TableCell>
                        <TableCell>{row.notes.join(" | ") || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
