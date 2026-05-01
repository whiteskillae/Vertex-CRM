import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRM Core — Enterprise System",
  description: "Production-grade CRM with role-based access control, real-time messaging, and advanced lead management.",
  keywords: "CRM, enterprise, leads, tasks, management",
  authors: [{ name: "CRM Systems" }],
  robots: "noindex, nofollow", // Private application
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning prevents mismatch from browser extensions
    // injecting attributes (e.g., dark-mode, translation tools)
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
