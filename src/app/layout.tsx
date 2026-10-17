import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BillGuard — AI audit for hospital bills & insurance claims",
  description:
    "Upload your hospital bill and insurer letter. BillGuard extracts every line item, flags overcharges and wrongful deductions with evidence, and drafts the dispute letter for you.",
};

export const viewport: Viewport = {
  themeColor: "#04050a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${mono.variable} antialiased`}>
      <body className="noise min-h-dvh overflow-x-hidden">{children}</body>
    </html>
  );
}
