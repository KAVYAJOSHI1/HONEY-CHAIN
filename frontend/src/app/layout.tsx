import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import HoneyBot from "@/components/HoneyBot";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = localFont({ src: "./fonts/GeistVF.woff", variable: "--font-geist-sans", weight: "100 900" });
const geistMono = localFont({ src: "./fonts/GeistMonoVF.woff", variable: "--font-geist-mono", weight: "100 900" });

export const metadata: Metadata = {
  title: { default: "Honey Chain — Honey traceability & smart beekeeping", template: "%s · Honey Chain" },
  description: "IoT hive telemetry, AI colony health analytics and blockchain-anchored honey provenance for beekeepers, KVIC and consumers.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#faf9f6" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ToastProvider>
          {children}
          <HoneyBot />
        </ToastProvider>
      </body>
    </html>
  );
}
