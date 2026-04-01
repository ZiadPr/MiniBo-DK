"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";

const navigationItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: <DashboardOutlinedIcon /> },
  { href: "/entry", label: "إدخال الإنتاج", icon: <EditNoteOutlinedIcon /> },
  { href: "/approval", label: "الاعتماد والطباعة", icon: <FactCheckOutlinedIcon /> },
  { href: "/required", label: "الإنتاجية المطلوبة", icon: <AssignmentOutlinedIcon /> },
  { href: "/admin", label: "الإدارة", icon: <SettingsOutlinedIcon /> }
];

interface SidebarProps {
  drawerWidth?: number;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  drawerWidth = 280,
  mobileOpen = false,
  onClose
}: SidebarProps) {
  const pathname = usePathname();

  const drawerPaperSx = {
    width: { xs: "min(86vw, 320px)", sm: drawerWidth },
    boxSizing: "border-box",
    borderLeft: "1px solid rgba(31, 111, 92, 0.12)",
    background:
      "linear-gradient(180deg, rgba(21, 93, 78, 0.98) 0%, rgba(17, 56, 48, 0.98) 100%)",
    color: "#F5FBF9"
  } as const;

  const sidebarContent = (
    <Stack spacing={1.5} sx={{ p: { xs: 2.25, sm: 3 }, minHeight: "100%" }}>
      <Box
        sx={{
          borderRadius: 4,
          bgcolor: "rgba(255,255,255,0.08)",
          p: 2
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          MiniBo Systems
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.82, mt: 0.75 }}>
          إدارة خطوط الإنتاج واعتمادها
        </Typography>
      </Box>

      <List sx={{ mt: 1, px: 0 }}>
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={onClose}
              sx={{
                borderRadius: 3,
                mb: 0.75,
                py: 1.15,
                bgcolor: active ? "rgba(255,255,255,0.12)" : "transparent",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.08)"
                }
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 42 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Stack>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": drawerPaperSx
        }}
      >
        {sidebarContent}
      </Drawer>

      <Drawer
        variant="permanent"
        anchor="right"
        open
        sx={{
          display: { xs: "none", lg: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": drawerPaperSx
        }}
      >
        {sidebarContent}
      </Drawer>
    </>
  );
}
