"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

const drawerWidth = 280;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar
        drawerWidth={drawerWidth}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: "100%",
          mr: { lg: `${drawerWidth}px` }
        }}
      >
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        <Box
          sx={{
            width: "100%",
            maxWidth: 1720,
            mx: "auto",
            px: { xs: 1.5, sm: 2.5, md: 3.5 },
            py: { xs: 2, md: 3 }
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
