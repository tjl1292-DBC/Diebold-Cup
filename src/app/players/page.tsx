import type { Metadata } from "next";
import Link from "next/link";
import { getStore, careerRows } from "@/lib/data";
import { PageTitle, ClubName } from "@/components/ui";

export const metadata: Metadata = { title: "Players" };

export default async function PlayersPage() {
  const s = await getStore();
  const rows = careerRows(s);
  const byId = new Map(rows.map((r) => [r.player.id, r]));
  const letters = new Map<string, typeof s.players>();
  for (const p of s.players) {
    const L = p.surname[0].toUpperCase();
    letters.set(L, [...(letters.get(L) ?? []), p]);
  }
  const keys = [...letters.keys()].sort();
  return (
    <>
      <PageTitle eyebrow={`${s.players.length} players`} title="Players" lede="Everyone who appears on a surviving scoresheet, listed by surname. A player who represented two clubs has a page for each, linked together." />
      <nav className="mb-6 flex flex-wrap gap-1 text-sm">
        {keys.map((k) => (
          <a key={k} href={`#${k}`} className="rounded border border-line bg-paper px-2 py-0.5 hover:border-accent">
            {k}
          </a>
        ))}
      </nav>
      {keys.map((k) => (
        <section key={k} id={k} className="mt-6">
          <h2 className="text-2xl font-semibold border-b border-line pb-1">{k}</h2>
          <div className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {letters.get(k)!.map((p) => {
              const r = byId.get(p.id);
              return (
                <div key={p.id} className="flex items-baseline justify-between gap-3 py-0.5">
                  <span>
                    <Link href={`/players/${p.id}`} className="font-semibold hover:text-accent">
                      {p.displayName}
                    </Link>
                    <span className="ml-2 text-ink-2">
                      <ClubName club={s.clubById.get(p.clubId)!} link={false} />
                    </span>
                  </span>
                  <span className="num whitespace-nowrap text-ink-3">
                    {p.firstSeason === p.lastSeason ? p.firstSeason : `${p.firstSeason}–${p.lastSeason}`}
                    {r && ` · ${r.matches}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
