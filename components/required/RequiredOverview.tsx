"use client";

import { useMemo } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useMiniBoStore } from "@/components/providers/MiniBoStoreProvider";
import { compareRequiredRows } from "@/lib/data/helpers";

const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: { xs: 4, md: 5 },
  border: "1px solid rgba(31,111,92,0.08)"
} as const;

export default function RequiredOverview() {
  const { ready, loading, error, store } = useMiniBoStore();

  const rows = useMemo(() => compareRequiredRows(store), [store]);

  const columns: GridColDef[] = [
    { field: "customerName", headerName: "العميل", flex: 1.1, minWidth: 150 },
    { field: "productName", headerName: "الصنف", flex: 1.5, minWidth: 220 },
    { field: "requiredQty", headerName: "المطلوب", type: "number", width: 110 },
    { field: "actualQty", headerName: "الفعلي", type: "number", width: 110 },
    {
      field: "variance",
      headerName: "الفارق",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value > 0 ? `+${params.value}` : `${params.value}`}
          color={params.value >= 0 ? "success" : "error"}
          size="small"
        />
      )
    },
    { field: "orderState", headerName: "الحالة", minWidth: 140 },
    { field: "warehouseName", headerName: "المخزن", minWidth: 140 }
  ];

  if (!ready || loading) {
    return <Typography>جارٍ تحميل الإنتاجية المطلوبة...</Typography>;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        الإنتاجية المطلوبة مقابل الفعلي
      </Typography>

      {error ? <Typography color="error">{error}</Typography> : null}

      <Paper elevation={0} sx={sectionPaperSx}>
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={700}>
            متابعة العملاء والطلبات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            الجدول يوضح المطلوب من الشيت المرفوع مقابل الفعلي الناتج من جلسات اليوم.
          </Typography>
        </Stack>
        <Box sx={{ width: "100%", overflowX: "auto", mt: 2 }}>
          <Box sx={{ minWidth: 980, height: { xs: 460, md: 520 } }}>
            <DataGrid
              rows={rows}
              columns={columns}
              disableRowSelectionOnClick
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 8, page: 0 }
                }
              }}
              pageSizeOptions={[8, 16, 32]}
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "rgba(31,111,92,0.05)"
                }
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Stack>
  );
}
