"use client";

import { useMemo, useState } from "react";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { useServerInsertedHTML } from "next/navigation";

const createEmotionCache = () => {
  const cache = createCache({
    key: "muirtl",
    stylisPlugins: [prefixer, rtlPlugin] as never
  });
  cache.compat = true;
  return cache;
};

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createEmotionCache();
    const prevInsert = cache.insert;
    let inserted: string[] = [];

    cache.insert = (...args) => {
      const serialized = args[1];
      if (!cache.inserted[serialized.name]) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };

    return {
      cache,
      flush: () => {
        const prevInserted = inserted;
        inserted = [];
        return prevInserted;
      }
    };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (!names.length) {
      return null;
    }

    let styles = "";
    names.forEach((name) => {
      styles += cache.inserted[name];
    });

    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  const [mode] = useState<"light" | "dark">("light");

  const theme = useMemo(
    () =>
      createTheme({
        direction: "rtl",
        palette: {
          mode,
          primary: { main: "#1F6F5C" },
          secondary: { main: "#C65D00" },
          success: { main: "#2E7D32" },
          warning: { main: "#ED6C02" },
          error: { main: "#D32F2F" },
          background:
            mode === "light"
              ? { default: "#F2F5F0", paper: "#FFFFFF" }
              : { default: "#0F1E1B", paper: "#17312C" }
        },
        typography: {
          fontFamily: "var(--font-cairo), sans-serif"
        },
        shape: {
          borderRadius: 18
        }
      }),
    [mode]
  );

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            ":root": {
              colorScheme: mode
            }
          }}
        />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
