import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
};

export const metadata: Metadata = {
  title: "GESTA - Gestion Financière",
  description: "Application de gestion des dépenses, budgets, contrats et prestataires.",
  manifest: "/manifest.ts",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GESTA",
  },
  formatDetection: {
    telephone: false,
  },
  // 🎯 Astuce : timestamp pour forcer le refresh
  icons: {
    icon: [
      { url: '/icon.png?2026', type: 'image/png' },
    ],
    apple: ['/icon.png?2026'],
    shortcut: ['/icon.png?2026'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png?2026" type="image/png" />
        <link rel="shortcut icon" href="/icon.png?2026" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png?2026" />
      </head>
      <body className={`${inter.className} antialiased bg-slate-50 dark:bg-slate-900`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}