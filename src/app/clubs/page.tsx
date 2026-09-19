import type { Metadata } from "next";
import Link from "next/link";
import { getStore, allTimeStandings, fmtPct } from "@/lib/data";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Clubs" };

export default async function ClubsPage() {
  const s = await getStore();
  const standings = allTimeStandings(s);
  return (
    <>
      <PageTitle eyebrow="Four seats" title="Clubs" lede="Three founding clubs, a fourth seat held by Allegheny Country Club from 1946 and by Longue Vue Club since at least 1995." />
      <div className="grid gap-4 sm:grid-cols-2">
        {standings.map((r) => (
          <Link key={r.club.id} href={`/clubs/${r.club.id}`} className="rounded border border-line bg-paper p-5 hover:border-accent">
            <div className="display text-2xl font-semibold">
              <span className={`club-dot ${r.club.id}`} />
              {r.club.name}
            </div>
            <div className="mt-1 text-sm text-ink-2">
              {r.firstSeason}–{r.club.lastSeason ?? "present"}
              {!r.club.firstSeasonCertain && " (first documented)"}
              {r.club.lastSeason && !r.club.lastSeasonCertain && " (last documented)"}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="display num text-3xl font-semibold">{r.titles}</div>
                <div className="text-ink-2">titles</div>
              </div>
              <div>
                <div className="display num text-3xl font-semibold">{r.seasons}</div>
                <div className="text-ink-2">seasons</div>
              </div>
              <div>
                <div className="display num text-3xl font-semibold">{fmtPct(r.points, r.available)}</div>
                <div className="text-ink-2">points won</div>
              </div>
            </div>
            {r.club.seatNote && <p className="mt-3 text-sm text-ink-2">{r.club.seatNote}</p>}
          </Link>
        ))}
      </div>
    </>
  );
}
