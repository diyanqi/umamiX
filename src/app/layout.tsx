import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://analytics.infvar.com"),
  title: {
    default: "无尽分析 Infvar Analytics",
    template: "%s | Infvar Analytics",
  },
  description:
    "比 Umami Cloud 更便宜、更开放、更适合开发者的隐私分析平台。",
  keywords: ["analytics", "privacy", "Infvar", "无尽分析"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
