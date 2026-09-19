import type { Metadata } from "next";
import Link from "next/link";
import { getStore, search } from "@/lib/data";
import { SearchBox } from "@/components/SearchBox";
import { PageTitle, Section, ClubName, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const s = await getStore();
  const r = search(s, q);
  const total = r.players.length + r.seasons.length + r.clubs.length;
  return (
    <>
      <PageTitle title="Search" lede={q ? `${total} result${total === 1 ? "" : "s"} for “${q}”` : "A surname, a year, or a club."}>
        <div className="mt-4 max-w-xl">
          <SearchBox defaultValue={q} large />
        </div>
      </PageTitle>
      {q && total === 0 && <Empty>Nothing matched. Surnames as written on the sheets work best; try just the last name.</Empty>}
      {r.seasons.length > 0 && (
        <Section title="Seasons">
          {r.seasons.map((x) => (
            <Link key={x.year} href={`/seasons/${x.year}`} className="block rounded border border-line bg-paper p-4 hover:border-accent">
              <span className="display text-2xl font-semibold">{x.year}</span>
              {x.datesText && <span className="ml-3 text-ink-2">{x.datesText}</span>}
            </Link>
          ))}
        </Section>
      )}
      {r.clubs.length > 0 && (
        <Section title="Clubs">
          {r.clubs.map((c) => (
            <Link key={c.id} href={`/clubs/${c.id}`} className="block rounded border border-line bg-paper p-4 hover:border-accent">
              <ClubName club={c} link={false} short={false} />
            </Link>
          ))}
        </Section>
      )}
      {r.players.length > 0 && (
        <Section title="Players">
          <div className="grid gap-2 sm:grid-cols-2">
            {r.players.map((p) => (
              <Link key={p.id} href={`/players/${p.id}`} className="rounded border border-line bg-paper px-4 py-3 hover:border-accent">
                <div className="font-semibold">{p.displayName}</div>
                <div className="text-sm text-ink-2">
                  <ClubName club={p.club} link={false} /> · {p.firstSeason === p.lastSeason ? p.firstSeason : `${p.firstSeason}–${p.lastSeason}`}
                  {p.matchedAlias && <span className="ml-2 text-ink-3">written “{p.matchedAlias}”</span>}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
