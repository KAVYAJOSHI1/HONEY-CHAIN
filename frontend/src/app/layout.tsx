import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import HoneyBot from "@/components/HoneyBot";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Honey Chain | Decentralized Traceability & Smart Beekeeping",
  description: "Real-time IoT telemetry, AI YOLO colony health analytics, and Sepolia ERC-721 immutable honey provenance ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950`}
      >
        {children}
        <HoneyBot />
      </body>
    </html>
  );
}
