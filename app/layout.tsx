import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";
import { NotificationSidebar } from "@/components/layout/notification-sidebar";
import { LiveNotifications } from "@/components/notifications/live-notifications";
import { OfflineSyncIndicator } from "@/components/dashboard/offline-sync-indicator";

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
  title: "HokeOS Sovereign",
  description: "Industrial metals recovery platform and yard intake monitor",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HokeOS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm font-semibold tracking-[0.24em] text-zinc-900 uppercase">
                Metals V1
              </Link>
              <nav className="hidden items-center gap-4 text-sm text-zinc-600 md:flex">
                <Link href="/dashboard" className="hover:text-zinc-900">
                  Dashboard
                </Link>
                <Link href="/batches" className="hover:text-zinc-900">
                  Batches
                </Link>
                <Link href="/calculator" className="hover:text-zinc-900">
                  Calculator
                </Link>
                <Link href="/billing" className="hover:text-zinc-900">
                  Billing
                </Link>
                <Link href="/reports/schedules" className="hover:text-zinc-900">
                  Scheduled Reports
                </Link>
                <Link href="/audit/verify" className="hover:text-zinc-900 font-medium text-violet-600">
                  Audit
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <NotificationSidebar />
              <UserMenu />
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <LiveNotifications />
        <OfflineSyncIndicator />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('Sovereign SW registered:', reg.scope);
                  }, function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
