import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School Finder",
  description: "Search and explore colleges and universities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-gray-900">
              School Finder
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link
                href="/analytics"
                className="text-gray-600 hover:text-gray-900"
              >
                Analytics
              </Link>
              <Link
                href="/manage"
                className="text-gray-600 hover:text-gray-900"
              >
                Manage
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
