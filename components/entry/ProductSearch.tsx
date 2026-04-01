"use client";

import { useEffect, useMemo, useState } from "react";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Typography
} from "@mui/material";

interface SearchResult {
  id: string;
  name: string;
  code: string;
  unit: string;
  conversionFactor: number;
  brandCode: string;
  status: string;
  subGroup: string;
  mainGroup: string;
}

interface ProductSearchProps {
  brandCode: string;
  status: "FR" | "FZ";
  selectedProductIds: string[];
  value?: string;
  onSelect: (productId: string) => void;
}

export default function ProductSearch({
  brandCode,
  status,
  selectedProductIds,
  value,
  onSelect
}: ProductSearchProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!anchorEl) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const searchParams = new URLSearchParams({
        brand: brandCode,
        status,
        q: query,
        limit: "20"
      });
      const response = await fetch(`/api/products/search?${searchParams.toString()}`, {
        signal: controller.signal
      });
      const payload = (await response.json()) as SearchResult[];
      setResults(payload);
      setLoading(false);
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [anchorEl, brandCode, query, status]);

  const selectedLabel = useMemo(() => value ?? "ابحث أو اختر الصنف", [value]);

  return (
    <>
      <TextField
        fullWidth
        value={selectedLabel}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.altKey && event.key === "ArrowDown") {
            event.preventDefault();
            setAnchorEl(event.currentTarget as HTMLElement);
          }
        }}
        InputProps={{
          readOnly: true,
          startAdornment: <SearchOutlinedIcon color="action" sx={{ mr: 1 }} />,
          endAdornment: <KeyboardArrowDownOutlinedIcon color="action" />
        }}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: "min(420px, calc(100vw - 24px))",
            maxWidth: "calc(100vw - 24px)",
            p: 1.5,
            borderRadius: 4
          }
        }}
      >
        <Stack spacing={1.5}>
          <TextField
            autoFocus
            fullWidth
            placeholder="ابحث بالاسم أو الكود"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            size="small"
          />

          <Box sx={{ minHeight: 260, maxHeight: 340, overflowY: "auto" }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: 220 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : (
              <List dense disablePadding>
                {results.map((item) => {
                  const alreadyAdded = selectedProductIds.includes(item.id);
                  return (
                    <ListItemButton
                      key={item.id}
                      disabled={alreadyAdded}
                      onClick={() => {
                        onSelect(item.id);
                        setAnchorEl(null);
                        setQuery("");
                      }}
                      sx={{
                        borderRadius: 3,
                        mb: 0.5,
                        opacity: alreadyAdded ? 0.6 : 1,
                        alignItems: "flex-start"
                      }}
                    >
                      <ListItemText
                        primary={item.name}
                        secondary={`${item.code} • ${item.unit} • معامل ${item.conversionFactor}`}
                        sx={{ minWidth: 0, mr: 1 }}
                      />
                      <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
                        <Chip label={item.status} size="small" color={item.status === "FR" ? "success" : "info"} />
                        {alreadyAdded ? <Typography variant="caption">مضاف مسبقاً</Typography> : null}
                      </Stack>
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </Stack>
      </Popover>
    </>
  );
}
