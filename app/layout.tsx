import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import AppProviders from "@/components/providers/AppProviders";
import "@/app/globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cairo"
});

export const metadata: Metadata = {
  title: "MiniBo Systems",
  description: "نظام إدارة خطوط الإنتاج واعتمادها"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className={cairo.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
