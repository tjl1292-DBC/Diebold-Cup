import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SearchBox } from "@/components/SearchBox";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "The Diebold Cup", template: "%s · The Diebold Cup" },
  description: "Results, records and history of the Diebold Cup, Pittsburgh's inter-club golf competition since 1945.",
};

const NAV = [
  ["/seasons", "Seasons"],
  ["/players", "Players"],
  ["/clubs", "Clubs"],
  ["/leaderboards", "Leaderboards"],
  ["/history", "History"],
  ["/ask", "Ask"],
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href="/" className="display text-2xl font-semibold tracking-tight text-ink">
              The Diebold Cup
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold uppercase tracking-wider text-ink-2">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="hover:text-accent">
                  {label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto w-full sm:w-64">
              <SearchBox />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-ink-2 flex flex-wrap gap-x-6 gap-y-2">
            <span>Pittsburgh Field Club · Fox Chapel Golf Club · Oakmont Country Club · Longue Vue Club</span>
            <span>Played since 1945.</span>
            <Link href="/history#archive" className="hover:text-accent">About the archive</Link>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
