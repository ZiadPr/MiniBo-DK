"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

export default function LoginPage() {
  const demoLoginEnabled = process.env.NODE_ENV !== "production";
  const router = useRouter();
  const [username, setUsername] = useState(demoLoginEnabled ? "admin" : "");
  const [password, setPassword] = useState(demoLoginEnabled ? "1234" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const payload = (await response.json()) as { message?: string };
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? "تعذر تسجيل الدخول");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 3
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 520,
          p: 4,
          borderRadius: 6,
          border: "1px solid rgba(31, 111, 92, 0.12)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(249,251,250,0.96) 100%)"
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1} alignItems="center" textAlign="center">
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "primary.main",
                color: "common.white"
              }}
            >
              <LockOutlinedIcon fontSize="large" />
            </Box>
            <Typography variant="h4" fontWeight={700}>
              MiniBo Systems
            </Typography>
            <Typography color="text.secondary">
              {demoLoginEnabled
                ? "للتشغيل المحلي فقط يمكنك استخدام admin / 1234 ما لم تغيّر بيانات البيئة."
                : "أدخل بيانات المستخدم المخصصة لك."}
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField label="اسم المستخدم" value={username} onChange={(event) => setUsername(event.target.value)} fullWidth />
          <TextField
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            fullWidth
          />

          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "تسجيل الدخول"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
