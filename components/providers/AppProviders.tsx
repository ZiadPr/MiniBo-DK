"use client";

import { Toaster } from "react-hot-toast";
import ThemeRegistry from "@/components/providers/ThemeRegistry";
import { MiniBoStoreProvider } from "@/components/providers/MiniBoStoreProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRegistry>
      <MiniBoStoreProvider>
        {children}
        <Toaster position="top-center" />
      </MiniBoStoreProvider>
    </ThemeRegistry>
  );
}
