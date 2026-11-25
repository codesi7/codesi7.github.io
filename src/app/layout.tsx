import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Codei7 Enterprise Ops | Corporate Admin Dashboard",
  description:
    "Corporate IT, Hardware, Operations, and Public GitHub JSON Data Management Admin Dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen selection:bg-indigo-500/20 selection:text-indigo-700 dark:selection:text-indigo-300">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
