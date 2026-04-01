"use client";

import { useMemo } from "react";
import {
  Chip,
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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard from "@/components/dashboard/KpiCard";
import { useMiniBoStore } from "@/components/providers/MiniBoStoreProvider";
import {
  aggregateBrandTotals,
  aggregateTopProducts,
  buildReportSummary,
  getSessionTotals
} from "@/lib/data/helpers";

const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: { xs: 4, md: 5 },
  border: "1px solid rgba(31,111,92,0.08)"
} as const;

export default function DashboardOverview() {
  const { ready, loading, error, store } = useMiniBoStore();

  const summary = useMemo(() => {
    const totalSessions = store.sessions.length;
    const totalNotes = store.sessions.reduce((sum, session) => sum + session.notes.length, 0);
    const totals = store.sessions.reduce(
      (accumulator, session) => {
        const sessionTotals = getSessionTotals(session);
        accumulator.cartons += sessionTotals.totalCartons;
        accumulator.kg += sessionTotals.totalKg;
        return accumulator;
      },
      { cartons: 0, kg: 0 }
    );

    return {
      totalSessions,
      totalNotes,
      cartons: totals.cartons,
      kg: totals.kg,
      brandTotals: aggregateBrandTotals(store),
      topProducts: aggregateTopProducts(store),
      reports: buildReportSummary(store)
    };
  }, [store]);

  if (!ready || loading) {
    return <Typography>جارٍ تحميل البيانات...</Typography>;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        لوحة التحكم التشغيلية
      </Typography>

      {error ? <Typography color="error">{error}</Typography> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard title="الجلسات الحالية" value={`${summary.totalSessions}`} subtitle="من ورديات اليوم" accent="#1F6F5C" />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard title="إجمالي العبوات" value={`${summary.cartons.toFixed(0)}`} subtitle="تجميعي لكل البراندات" accent="#C65D00" />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard title="إجمالي الوزن" value={`${summary.kg.toFixed(1)} كجم`} subtitle="محسوب آلياً من المعامل" accent="#0277BD" />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard title="الملاحظات" value={`${summary.totalNotes}`} subtitle="مرتبطة بالاعتماد والطباعة" accent="#8E24AA" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} xl={7}>
          <Paper elevation={0} sx={{ ...sectionPaperSx, height: { xs: 320, md: 360 } }}>
            <Stack spacing={2} sx={{ height: "100%" }}>
              <Typography variant="h6" fontWeight={700}>
                التوزيع حسب البراند
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.brandTotals}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="brand" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalKg" fill="#1F6F5C" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} xl={5}>
          <Paper elevation={0} sx={{ ...sectionPaperSx, height: { xs: "auto", md: 360 } }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>
                أكثر الأصناف إنتاجاً
              </Typography>
              <TableContainer sx={{ borderRadius: 4, border: "1px solid rgba(31,111,92,0.08)", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>الصنف</TableCell>
                      <TableCell>البراند</TableCell>
                      <TableCell align="center">عبوة</TableCell>
                      <TableCell align="center">كجم</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.topProducts.map((product) => (
                      <TableRow key={product.productName}>
                        <TableCell>{product.productName}</TableCell>
                        <TableCell>{product.brandCode}</TableCell>
                        <TableCell align="center">{product.cartons.toFixed(0)}</TableCell>
                        <TableCell align="center">{product.kg.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={sectionPaperSx}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            قوالب التقارير الجاهزة
          </Typography>
          <Grid container spacing={2}>
            {summary.reports.map((report) => (
              <Grid item xs={12} xl={6} key={report.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    bgcolor: "rgba(31,111,92,0.04)",
                    border: "1px solid rgba(31,111,92,0.08)",
                    height: "100%"
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    gap={1.5}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {report.icon} {report.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.description}
                      </Typography>
                    </Stack>
                    <Chip label={`${report.productCount} صنف`} sx={{ bgcolor: report.color, color: "#fff" }} />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Paper>
    </Stack>
  );
}
