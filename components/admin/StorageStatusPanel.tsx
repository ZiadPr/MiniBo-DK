"use client";

import { useCallback, useEffect, useState } from "react";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import { Alert, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import type { StorageDiagnostics } from "@/lib/types";

const formatDateTime = (value?: string) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ar-EG");
};

const formatBytes = (value?: number) => {
  if (typeof value !== "number") {
    return "-";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function StorageStatusPanel() {
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDiagnostics = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/system/storage-status", {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json()) as StorageDiagnostics & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? payload.error ?? "تعذر تحميل حالة التخزين");
      }

      setDiagnostics(payload);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل حالة التخزين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 5, border: "1px solid rgba(31,111,92,0.08)" }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={700}>
              حالة التخزين
            </Typography>
            <Typography variant="body2" color="text.secondary">
              فحص مباشر للـ backend الحالي من داخل التطبيق
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            size="small"
            startIcon={<SyncOutlinedIcon />}
            disabled={loading}
            onClick={() => void refreshDiagnostics()}
          >
            {loading ? "جارٍ التحديث..." : "تحديث الحالة"}
          </Button>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {diagnostics ? (
          <Stack spacing={2}>
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
              <Chip
                label={diagnostics.backend === "postgres" ? "PostgreSQL" : "ملف محلي"}
                color={diagnostics.backend === "postgres" ? "primary" : "warning"}
                variant="outlined"
              />
              <Chip
                label={diagnostics.healthy ? "الحالة سليمة" : "بحاجة متابعة"}
                color={diagnostics.healthy ? "success" : "error"}
              />
              <Chip
                label={diagnostics.databaseUrlConfigured ? "DATABASE_URL مضبوط" : "بدون DATABASE_URL"}
                color={diagnostics.databaseUrlConfigured ? "info" : "default"}
                variant="outlined"
              />
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary">
                  آخر فحص
                </Typography>
                <Typography fontWeight={600}>{formatDateTime(diagnostics.checkedAt)}</Typography>
              </Grid>

              {diagnostics.file ? (
                <>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      ملف التخزين
                    </Typography>
                    <Typography fontWeight={600}>{diagnostics.file.path}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      حجم الملف
                    </Typography>
                    <Typography fontWeight={600}>{formatBytes(diagnostics.file.sizeBytes)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      آخر تعديل
                    </Typography>
                    <Typography fontWeight={600}>
                      {formatDateTime(diagnostics.file.lastModifiedAt)}
                    </Typography>
                  </Grid>
                </>
              ) : null}

              {diagnostics.postgres ? (
                <>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      المضيف
                    </Typography>
                    <Typography fontWeight={600}>{diagnostics.postgres.host ?? "-"}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      قاعدة البيانات
                    </Typography>
                    <Typography fontWeight={600}>{diagnostics.postgres.database ?? "-"}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      الاتصال
                    </Typography>
                    <Typography fontWeight={600}>
                      {diagnostics.postgres.connected ? "متصل" : "غير متصل"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      جاهزية الـ schema
                    </Typography>
                    <Typography fontWeight={600}>
                      {diagnostics.postgres.schemaReady ? "مكتملة" : "ناقصة"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      زمن الاستجابة
                    </Typography>
                    <Typography fontWeight={600}>
                      {typeof diagnostics.postgres.latencyMs === "number"
                        ? `${diagnostics.postgres.latencyMs} ms`
                        : "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      وقت الخادم
                    </Typography>
                    <Typography fontWeight={600}>
                      {formatDateTime(diagnostics.postgres.serverTime)}
                    </Typography>
                  </Grid>
                </>
              ) : null}
            </Grid>

            {diagnostics.recordCounts ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  أعداد البيانات الحالية
                </Typography>
                <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                  <Chip label={`البراندات: ${diagnostics.recordCounts.brands}`} variant="outlined" />
                  <Chip label={`الأصناف: ${diagnostics.recordCounts.products}`} variant="outlined" />
                  <Chip label={`الجلسات: ${diagnostics.recordCounts.sessions}`} variant="outlined" />
                  <Chip label={`صفوف الإنتاج: ${diagnostics.recordCounts.sessionRows}`} variant="outlined" />
                  <Chip label={`الملاحظات: ${diagnostics.recordCounts.notes}`} variant="outlined" />
                  <Chip label={`السجل التاريخي: ${diagnostics.recordCounts.history}`} variant="outlined" />
                </Stack>
              </Stack>
            ) : null}

            {diagnostics.warnings.map((warning) => (
              <Alert key={warning} severity="warning">
                {warning}
              </Alert>
            ))}

            {diagnostics.error ? <Alert severity="error">{diagnostics.error}</Alert> : null}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            {loading ? "جارٍ فحص حالة التخزين..." : "لم يتم تحميل حالة التخزين بعد."}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
