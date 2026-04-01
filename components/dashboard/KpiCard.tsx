import { Paper, Stack, Typography } from "@mui/material";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
}

export default function KpiCard({ title, value, subtitle, accent }: KpiCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: { xs: 4, md: 5 },
        border: "1px solid rgba(31, 111, 92, 0.08)",
        position: "relative",
        overflow: "hidden",
        height: "100%"
      }}
    >
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15, overflowWrap: "anywhere" }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: accent }}>
          {subtitle}
        </Typography>
      </Stack>
      <span
        style={{
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          width: 8,
          height: "100%",
          background: accent
        }}
      />
    </Paper>
  );
}
