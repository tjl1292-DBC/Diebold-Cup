import type { Metadata } from "next";
import Link from "next/link";
import { getStore, careerRows, lowRounds, partnershipRows, fmtPts, fmtPct, pct, ERA_LABEL } from "@/lib/data";
import { PageTitle, Section, ClubName, PlayerName, SeasonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Leaderboards" };

type Search = { club?: string; era?: string; min?: string };

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const s = await getStore();
  const club = sp.club && s.clubById.has(sp.club) ? sp.club : null;
  const era = sp.era && s.eras.some((e) => e.id === sp.era) ? sp.era : null;
  const minMatches = Math.max(1, Number(sp.min ?? 12) || 12);
  const filter = { club, era };
  const rows = careerRows(s, filter);
  const eligible = rows.filter((r) => r.matches >= minMatches);
  const byShare = [...eligible].sort((a, b) => pct(b.points, b.available) - pct(a.points, a.available)).slice(0, 25);
  const byPoints = [...rows].sort((a, b) => b.points - a.points).slice(0, 25);
  const bySingles = [...eligible].filter((r) => r.singlesMatches >= Math.ceil(minMatches / 2)).sort((a, b) => b.singlesPoints / b.singlesMatches - a.singlesPoints / a.singlesMatches).slice(0, 25);
  const byAppearances = [...rows].sort((a, b) => b.seasons - a.seasons || b.matches - a.matches).slice(0, 25);
  const lows = lowRounds(s, filter, 25);
  const pairs = partnershipRows(s, filter).filter((p) => p.times >= 3).sort((a, b) => pct(b.points, b.available) - pct(a.points, a.available) || b.times - a.times).slice(0, 25);
  const qs = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { club: club ?? "", era: era ?? "", min: String(minMatches), ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    return `/leaderboards?${p.toString()}`;
  };
  const chip = (active: boolean, href: string, label: string) => (
    <Link key={href} href={href} className={`rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-white" : "border-line bg-paper hover:border-accent"}`}>
      {label}
    </Link>
  );
  const scope = `${club ? s.clubById.get(club)!.shortName : "All clubs"} · ${era ? ERA_LABEL[era] : "all eras"}`;

  return (
    <>
      <PageTitle eyebrow="Records" title="Leaderboards" lede="Every table divides points won by points available, because pairs matches were worth 6, 3 or 4 points depending on the year. Raw totals are shown too, but only the share compares fairly across eras.">
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2 mr-1">Club</span>
          {chip(!club, qs({ club: "" }), "All")}
          {s.clubs.filter((c) => c.id !== "allegheny").map((c) => chip(club === c.id, qs({ club: c.id }), c.shortName))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2 mr-1">Era</span>
          {chip(!era, qs({ era: "" }), "All")}
          {s.eras.filter((e) => e.id !== "early").map((e) => chip(era === e.id, qs({ era: e.id }), ERA_LABEL[e.id]))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2 mr-1">Minimum matches</span>
          {[4, 12, 24, 40].map((n) => chip(minMatches === n, qs({ min: String(n) }), String(n)))}
        </div>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Career share of points" aside={`${scope} · min ${minMatches} matches`}>
          <Board>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th className="r">Matches</th>
                <th className="r">Points</th>
                <th className="r">Share</th>
              </tr>
            </thead>
            <tbody>
              {byShare.map((r, i) => (
                <tr key={r.player.id}>
                  <td className="text-ink-3">{i + 1}</td>
                  <td>
                    <PlayerName player={r.player} /> <span className="text-ink-3 text-sm"><ClubName club={r.club} link={false} /></span>
                  </td>
                  <td className="r">{r.matches}</td>
                  <td className="r">{fmtPts(r.points)}<span className="text-ink-3">/{fmtPts(r.available)}</span></td>
                  <td className="r font-semibold">{fmtPct(r.points, r.available)}</td>
                </tr>
              ))}
            </tbody>
          </Board>
        </Section>

        <Section title="Singles average" aside={`${scope} · points per singles match, of 9`}>
          <Board>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th className="r">Singles</th>
                <th className="r">Points</th>
                <th className="r">Avg</th>
              </tr>
            </thead>
            <tbody>
              {bySingles.map((r, i) => (
                <tr key={r.player.id}>
                  <td className="text-ink-3">{i + 1}</td>
                  <td>
                    <PlayerName player={r.player} /> <span className="text-ink-3 text-sm"><ClubName club={r.club} link={false} /></span>
                  </td>
                  <td className="r">{r.singlesMatches}</td>
                  <td className="r">{fmtPts(r.singlesPoints)}</td>
                  <td className="r font-semibold">{(r.singlesPoints / r.singlesMatches).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Board>
        </Section>

        <Section title="Career points" aside={`${scope} · raw totals, not era-adjusted`}>
          <Board>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th className="r">Seasons</th>
                <th className="r">Matches</th>
                <th className="r">Points</th>
              </tr>
            </thead>
            <tbody>
              {byPoints.map((r, i) => (
                <tr key={r.player.id}>
                  <td className="text-ink-3">{i + 1}</td>
                  <td>
                    <PlayerName player={r.player} /> <span className="text-ink-3 text-sm"><ClubName club={r.club} link={false} /></span>
                  </td>
                  <td className="r">{r.seasons}</td>
                  <td className="r">{r.matches}</td>
                  <td className="r font-semibold">{fmtPts(r.points)}</td>
                </tr>
              ))}
            </tbody>
          </Board>
        </Section>

        <Section title="Appearances" aside={scope}>
          <Board>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th className="r">Seasons</th>
                <th className="r">Matches</th>
                <th className="r">Share</th>
              </tr>
            </thead>
            <tbody>
              {byAppearances.map((r, i) => (
                <tr key={r.player.id}>
                  <td className="text-ink-3">{i + 1}</td>
                  <td>
                    <PlayerName player={r.player} /> <span className="text-ink-3 text-sm"><ClubName club={r.club} link={false} /></span>
                  </td>
                  <td className="r font-semibold">{r.seasons}</td>
                  <td className="r">{r.matches}</td>
                  <td className="r">{fmtPct(r.points, r.available)}</td>
                </tr>
              ))}
            </tbody>
          </Board>
        </Section>

        <Section title="Low rounds" aside={`${scope} · singles and pairs mixed, as recorded`}>
          <Board>
            <thead>
              <tr>
                <th className="r">Gross</th>
                <th>Player(s)</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {lows.map((l) => (
                <tr key={l.entry.id}>
                  <td className="r font-semibold text-lg">{l.entry.gross}</td>
                  <td>
                    {l.players.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && " / "}
                        <PlayerName player={p} />
                      </span>
                    ))}{" "}
                    <span className="text-ink-3 text-sm"><ClubName club={l.club} link={false} /></span>
                  </td>
                  <td className="text-ink-2 text-sm">
                    <SeasonLink season={l.session.seasonYear} /> {l.session.name}
                    {l.session.venueClubId && <> at {s.clubById.get(l.session.venueClubId)!.shortName}</>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Board>
        </Section>

        <Section title="Best partnerships" aside={`${scope} · at least 3 matches together`}>
          <Board>
            <thead>
              <tr>
                <th>Pair</th>
                <th className="r">Times</th>
                <th className="r">Points</th>
                <th className="r">Share</th>
                <th>Years</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.players[0].id + p.players[1].id}>
                  <td>
                    <PlayerName player={p.players[0]} /> / <PlayerName player={p.players[1]} />{" "}
                    <span className="text-ink-3 text-sm"><ClubName club={p.club} link={false} /></span>
                  </td>
                  <td className="r">{p.times}</td>
                  <td className="r">{fmtPts(p.points)}<span className="text-ink-3">/{fmtPts(p.available)}</span></td>
                  <td className="r font-semibold">{fmtPct(p.points, p.available)}</td>
                  <td className="text-ink-2 num text-sm">{p.years.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </Board>
        </Section>
      </div>
    </>
  );
}

function Board({ children }: { children: React.ReactNode }) {
  return (
    <div className="tablewrap rounded border border-line bg-paper">
      <table className="data">{children}</table>
    </div>
  );
}
