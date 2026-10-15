import type { Metadata } from "next";
import Link from "next/link";
import { getStore, careerRows, lowRounds, partnershipRows, rosterAges, rosterBands, playerSeasonAges, fmtPts, fmtPct, fmtAge, fmtApprox, pct, ERA_LABEL, type PlayerSeasonAge } from "@/lib/data";
import { AGE_BANDS } from "@/lib/ages";
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
  const ages = rosterAges(s, filter).sort((a, b) => b.year - a.year || a.club.sortOrder - b.club.sortOrder);
  const ageSeasons = ages.filter((r) => r.withYear > 0);
  const knownAges = playerSeasonAges(s, filter);
  const youngest = knownAges.slice(0, 15);
  const oldest = [...knownAges].reverse().slice(0, 15);
  const coverage = { players: ages.reduce((t, r) => t + r.players, 0), withYear: ages.reduce((t, r) => t + r.withYear, 0), approx: ages.reduce((t, r) => t + r.approx, 0) };
  const bandRows = rosterBands(s, filter)
    .filter((r) => r.unknown < r.players)
    .sort((a, b) => b.year - a.year || a.club.sortOrder - b.club.sortOrder);
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

        <Section title="Youngest player-seasons" aside={`${scope} · age in the season year`}>
          <AgeBoard rows={youngest} />
        </Section>

        <Section title="Oldest player-seasons" aside={`${scope} · age in the season year`}>
          <AgeBoard rows={oldest} />
        </Section>

        <div className="lg:col-span-2">
          <Section id="ages" title="Roster age by season" aside={`${scope} · birth years known for ${coverage.withYear} of ${coverage.players} player-seasons${coverage.approx ? `, ${coverage.approx} approximate` : ""}`}>
            <p className="mb-3 text-sm text-ink-2">
              Age is the season year minus the birth year. An average is only as good as its coverage, so each row says how many of the club&apos;s players that year have a birth year on file; rows with fewer than half are
              marked. &ldquo;c.&rdquo; marks a year inferred from an age roster or a school class rather than a recorded date. Under 25 and under 30 count only players with a birth year.
            </p>
            {ageSeasons.length === 0 ? (
              <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2">No birth years on file for this selection.</p>
            ) : (
              <Board>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Club</th>
                    <th className="r">Players</th>
                    <th className="r">With birth year</th>
                    <th className="r">Avg age</th>
                    <th className="r">Under 25</th>
                    <th className="r">Under 30</th>
                    <th>Youngest</th>
                    <th>Oldest</th>
                  </tr>
                </thead>
                <tbody>
                  {ages.map((r) => {
                    const thin = r.withYear * 2 < r.players;
                    return (
                      <tr key={`${r.year}-${r.club.id}`} className={r.withYear === 0 ? "text-ink-3" : ""}>
                        <td>
                          <SeasonLink season={r.year} />
                        </td>
                        <td>
                          <ClubName club={r.club} />
                        </td>
                        <td className="r">{r.players}</td>
                        <td className={`r ${thin ? "text-brass" : "text-ink-2"}`} title={thin ? "Fewer than half the roster has a birth year on file" : undefined}>
                          {r.withYear}
                          {r.approx > 0 && <span className="text-ink-3 text-xs"> ({r.approx} c.)</span>}
                        </td>
                        <td className="r font-semibold">{fmtAge(r.avgAge)}</td>
                        <td className="r">{r.withYear ? r.under25 : "–"}</td>
                        <td className="r">{r.withYear ? r.under30 : "–"}</td>
                        <td className="text-sm">{r.youngest && <AgeName a={r.youngest} />}</td>
                        <td className="text-sm">{r.oldest && <AgeName a={r.oldest} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Board>
            )}
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section id="bands" title="Roster by age band" aside={`${scope} · players per band each season`}>
            <p className="mb-3 text-sm text-ink-2">
              Each player counted once per season in the band his age falls in. A player with only an age band on file (a captain&apos;s &ldquo;he&apos;s 50+&rdquo;) is shown as <span className="text-brass">+n</span> in the
              lowest band he could be in that year, since 50+ in 2026 was 37 or older in 2013. The last column is players with nothing on file.
            </p>
            {bandRows.length === 0 ? (
              <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2">No ages on file for this selection.</p>
            ) : (
              <Board>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Club</th>
                    <th className="r">Players</th>
                    {AGE_BANDS.map((b) => (
                      <th key={b.id} className="r">
                        {b.label}
                      </th>
                    ))}
                    <th className="r">Unknown</th>
                  </tr>
                </thead>
                <tbody>
                  {bandRows.map((r) => (
                    <tr key={`${r.year}-${r.club.id}`} className={r.unknown === r.players ? "text-ink-3" : ""}>
                      <td>
                        <SeasonLink season={r.year} />
                      </td>
                      <td>
                        <ClubName club={r.club} />
                      </td>
                      <td className="r">{r.players}</td>
                      {r.bands.map((c) => (
                        <td key={c.band.id} className="r">
                          {c.known || (c.atLeast ? "" : "–")}
                          {c.atLeast > 0 && <span className="text-brass"> +{c.atLeast}</span>}
                        </td>
                      ))}
                      <td className="r text-ink-3">{r.unknown || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </Board>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

function AgeName({ a }: { a: PlayerSeasonAge }) {
  return (
    <>
      <PlayerName player={a.player} /> <span className="num text-ink-2">{fmtApprox(a.age, a.approx)}</span>
    </>
  );
}

function AgeBoard({ rows }: { rows: PlayerSeasonAge[] }) {
  if (!rows.length) return <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2">No birth years on file for this selection.</p>;
  return (
    <Board>
      <thead>
        <tr>
          <th className="r">Age</th>
          <th>Player</th>
          <th>Season</th>
          <th className="r">Born</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={`${a.player.id}-${a.year}`}>
            <td className="r font-semibold text-lg">{fmtApprox(a.age, a.approx)}</td>
            <td>
              <PlayerName player={a.player} /> <span className="text-ink-3 text-sm"><ClubName club={a.club} link={false} /></span>
            </td>
            <td className="text-ink-2 text-sm">
              <SeasonLink season={a.year} />
            </td>
            <td className="r text-ink-2 num">{fmtApprox(a.player.birthYear!, a.approx)}</td>
          </tr>
        ))}
      </tbody>
    </Board>
  );
}

function Board({ children }: { children: React.ReactNode }) {
  return (
    <div className="tablewrap rounded border border-line bg-paper">
      <table className="data">{children}</table>
    </div>
  );
}
