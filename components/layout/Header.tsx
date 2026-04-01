"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { useMiniBoStore } from "@/components/providers/MiniBoStoreProvider";
import { getCurrentDateLabel } from "@/lib/data/helpers";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { store } = useMiniBoStore();

  const openSessionsCount = useMemo(
    () => store.sessions.filter((session) => session.status !== "approved").length,
    [store.sessions]
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(31, 111, 92, 0.08)"
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: { xs: 1.25, md: 2 },
          px: { xs: 1.25, sm: 2 },
          py: 1,
          flexWrap: "wrap"
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ minWidth: 0, flex: "1 1 320px", width: { xs: "100%", sm: "auto" } }}
        >
          <IconButton
            color="primary"
            onClick={onMenuClick}
            sx={{ display: { xs: "inline-flex", lg: "none" } }}
          >
            <MenuOutlinedIcon />
          </IconButton>
          <IconButton color="primary" sx={{ flexShrink: 0 }}>
            <Badge badgeContent={openSessionsCount} color="error">
              <NotificationsOutlinedIcon />
            </Badge>
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700}>
              جاهزية تشغيلية فورية
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {getCurrentDateLabel()} • {openSessionsCount} جلسات نشطة
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          justifyContent={{ xs: "space-between", sm: "flex-end" }}
          sx={{ flex: "1 1 240px", width: { xs: "100%", sm: "auto" } }}
        >
          <Avatar sx={{ bgcolor: "primary.main", flexShrink: 0 }}>م</Avatar>
          <Button
            variant="outlined"
            startIcon={<LogoutOutlinedIcon />}
            color="inherit"
            onClick={handleLogout}
            sx={{ whiteSpace: "nowrap" }}
          >
            تسجيل الخروج
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
