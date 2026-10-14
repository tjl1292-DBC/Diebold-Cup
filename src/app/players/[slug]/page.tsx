import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore, playerView, fmtPts, fmtPct } from "@/lib/data";
import { PageTitle, Section, Stat, ClubName, PlayerName, SeasonLink, Pill, FlagList, Place, Empty } from "@/components/ui";

type Params = { slug: string };

export async function generateStaticParams() {
  const s = await getStore();
  return s.players.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getStore();
  const p = s.playerById.get(slug);
  return { title: p ? `${p.displayName} (${s.clubById.get(p.clubId)?.shortName})` : "Player" };
}

export default async function PlayerPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const s = await getStore();
  const v = playerView(s, slug);
  if (!v) notFound();
  const { player, club, totals } = v;
  const singlesAvg = totals.singlesMatches ? totals.singlesPoints / totals.singlesMatches : null;
  const span = player.firstSeason === player.lastSeason ? `${player.firstSeason}` : `${player.firstSeason}–${player.lastSeason}`;
  const born = player.birthYear === null ? null : `born ${player.birthYearApprox ? "c. " : ""}${player.birthYear}`;

  return (
    <>
      <PageTitle eyebrow={<ClubName club={club} short={false} />} title={player.displayName} lede={[span, `${totals.seasons} season${totals.seasons === 1 ? "" : "s"}`, `${totals.matches} match${totals.matches === 1 ? "" : "es"}`, born].filter(Boolean).join(" · ")}>
        {player.note && <p className="mt-2 text-sm text-ink-2">{player.note}</p>}
        {v.samePerson.length > 0 && (
          <p className="mt-2 text-sm text-ink-2">
            Also played for{" "}
            {v.samePerson.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ", "}
                <Link href={`/players/${p.id}`} className="text-accent font-semibold">
                  {p.club.shortName}
                </Link>{" "}
                ({p.firstSeason === p.lastSeason ? p.firstSeason : `${p.firstSeason}–${p.lastSeason}`})
              </span>
            ))}
            .
          </p>
        )}
        {v.aliases.length > 1 && (
          <p className="mt-2 text-xs text-ink-3">
            On the sheets as {v.aliases.map((a) => `${a.rawName} (${a.occurrences})`).join(", ")}.
          </p>
        )}
        {v.flags.length > 0 && (
          <div className="mt-3">
            <FlagList flags={v.flags} />
          </div>
        )}
      </PageTitle>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Points won" value={fmtPts(totals.points)} sub={`of ${fmtPts(totals.available)} available`} />
        <Stat label="Share of available" value={fmtPct(totals.points, totals.available)} />
        <Stat label="Singles average" value={singlesAvg === null ? "–" : singlesAvg.toFixed(2)} sub={`per match, of 9 · ${totals.singlesMatches} singles`} />
        <Stat label="Singles share" value={fmtPct(totals.singlesPoints, totals.singlesAvailable)} />
        <Stat label="Pairs share" value={fmtPct(totals.pairsPoints, totals.pairsAvailable)} sub={`${totals.pairsMatches} pair matches`} />
        <Stat label="Best gross" value={v.bestGross[0]?.gross ?? "–"} sub={v.bestGross[0] ? `${v.bestGross[0].match.session.seasonYear} ${v.bestGross[0].match.session.name}` : "not recorded"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Points by season">
          <div className="tablewrap rounded border border-line bg-paper">
            <table className="data">
              <thead>
                <tr>
                  <th>Season</th>
                  <th className="r">Matches</th>
                  <th className="r">Points</th>
                  <th className="r">Avail.</th>
                  <th className="r">Share</th>
                  <th className="r">Singles</th>
                  <th className="r">Best gross</th>
                  <th className="r">Club</th>
                </tr>
              </thead>
              <tbody>
                {v.seasons.map((l) => (
                  <tr key={l.year}>
                    <td>
                      <SeasonLink season={l.year} />
                    </td>
                    <td className="r">{l.matches}</td>
                    <td className="r font-semibold">{fmtPts(l.points)}</td>
                    <td className="r text-ink-2">{fmtPts(l.available)}</td>
                    <td className="r">{fmtPct(l.points, l.available)}</td>
                    <td className="r text-ink-2">{l.singlesMatches ? `${fmtPts(l.singlesPoints)}/${l.singlesAvailable}` : "–"}</td>
                    <td className="r text-ink-2">{l.bestGross ?? ""}</td>
                    <td className="r">
                      <Place n={l.placeOfClub} />
                      {l.clubChampion && <span className="ml-1 text-brass" title="Club won the cup">★</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div>
          <Section title="Record against each club">
            <div className="tablewrap rounded border border-line bg-paper">
              <table className="data">
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th className="r">Matches</th>
                    <th className="r">Points</th>
                    <th className="r">Available</th>
                    <th className="r">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {v.vsClubs.map((r) => (
                    <tr key={r.club.id}>
                      <td>
                        <ClubName club={r.club} />
                      </td>
                      <td className="r">{r.matches}</td>
                      <td className="r font-semibold">{fmtPts(r.points)}</td>
                      <td className="r text-ink-2">{fmtPts(r.available)}</td>
                      <td className="r">{fmtPct(r.points, r.available)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Partnerships">
            {v.partnerships.length === 0 ? (
              <Empty>No pairs matches on record.</Empty>
            ) : (
              <div className="tablewrap rounded border border-line bg-paper">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Partner</th>
                      <th className="r">Times</th>
                      <th className="r">Points</th>
                      <th className="r">Share</th>
                      <th className="r">Best</th>
                      <th>Years</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.partnerships.map((p) => (
                      <tr key={p.partner.id}>
                        <td>
                          <PlayerName player={p.partner} />
                        </td>
                        <td className="r">{p.times}</td>
                        <td className="r font-semibold">
                          {fmtPts(p.points)}
                          <span className="text-ink-3">/{fmtPts(p.available)}</span>
                        </td>
                        <td className="r">{fmtPct(p.points, p.available)}</td>
                        <td className="r text-ink-2">{p.bestGross ?? ""}</td>
                        <td className="text-ink-2 num">{p.years.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>

      {v.awards.length > 0 && (
        <Section title="Awards">
          <ul className="space-y-1">
            {v.awards.map((a) => (
              <li key={a.id}>
                <SeasonLink season={a.seasonYear} /> · {{ low_gross: "Low gross", scotch: "Scotch match", better_ball: "Better ball" }[a.type] ?? a.type}
                {a.scoreText && <span className="text-ink-2"> · {a.scoreText}</span>}
                {a.tied && <Pill tone="brass">tie</Pill>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Every match" aside={`${v.matches.length} rows`}>
        <div className="tablewrap rounded border border-line bg-paper">
          <table className="data">
            <thead>
              <tr>
                <th>Season</th>
                <th>Session</th>
                <th>Venue</th>
                <th>Partner</th>
                <th className="r">Gross</th>
                {s.clubs.filter((c) => c.id !== club.id && v.vsClubs.some((x) => x.club.id === c.id)).map((c) => (
                  <th key={c.id} className="r" title={`vs ${c.shortName}`}>
                    {c.abbreviation}
                  </th>
                ))}
                <th className="r">Pts</th>
                <th className="r">Of</th>
              </tr>
            </thead>
            <tbody>
              {v.matches.map((m) => {
                const ep = s.entryPlayersByEntry.get(m.entry.id)?.find((x) => x.playerId === player.id);
                return (
                  <tr key={m.entry.id}>
                    <td>
                      <SeasonLink season={m.session.seasonYear} />
                    </td>
                    <td>
                      <Link href={`/seasons/${m.session.seasonYear}#${m.session.id}`} className="hover:text-accent">
                        {m.session.name}
                      </Link>
                    </td>
                    <td>{m.venue ? <ClubName club={m.venue} /> : <span className="text-ink-3">–</span>}</td>
                    <td>
                      {m.partner ? <PlayerName player={m.partner} /> : ""}
                      {ep?.confidence === "low" && <span className="ml-1 text-brass" title="Name matched by surname and season; unconfirmed">*</span>}
                      {m.flags.length > 0 && (
                        <div className="mt-1">
                          <FlagList flags={m.flags} compact />
                        </div>
                      )}
                    </td>
                    <td className="r text-ink-2">{m.entry.gross ?? ""}</td>
                    {s.clubs.filter((c) => c.id !== club.id && v.vsClubs.some((x) => x.club.id === c.id)).map((c) => {
                      const x = m.vs.find((y) => y.club.id === c.id);
                      return (
                        <td key={c.id} className="r">
                          {x ? fmtPts(x.points) : <span className="text-ink-3">–</span>}
                        </td>
                      );
                    })}
                    <td className="r font-semibold">{fmtPts(m.entry.totalPoints)}</td>
                    <td className="r text-ink-3">{fmtPts(m.entry.available)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">Points per match: singles 3 per opponent (9 max). Pairs: 6 per opponent through 2007, 3 from 2008 to 2014, 4 from 2015. Share of available is the fair comparison across eras.</p>
      </Section>
    </>
  );
}
