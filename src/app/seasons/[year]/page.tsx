import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore, seasonView, fmtPts, ERA_LABEL, type EntryView } from "@/lib/data";
import { PageTitle, Section, ClubName, PlayerName, Place, Pill, FlagList, STATUS_LABEL, Empty } from "@/components/ui";

type Params = { year: string };

export async function generateStaticParams() {
  const s = await getStore();
  return s.seasons.map((x) => ({ year: String(x.year) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year} season` };
}

function EntryRow({ e, clubsInSeason }: { e: EntryView; clubsInSeason: string[] }) {
  const unconfirmed = e.players.some((p) => p.confidence === "low");
  return (
    <tr>
      <td>
        {e.players.map((p, i) => (
          <span key={p.playerId}>
            {i > 0 && " / "}
            <PlayerName player={p.player} unconfirmed={p.confidence === "low"} />
          </span>
        ))}
        {(e.flags.length > 0 || unconfirmed) && (
          <div className="mt-1">
            <FlagList flags={e.flags} compact />
          </div>
        )}
      </td>
      <td className="r text-ink-2">{e.entry.gross ?? ""}</td>
      {clubsInSeason.map((c) => {
        const v = e.vs.find((x) => x.club.id === c);
        return (
          <td key={c} className="r">
            {c === e.club.id ? <span className="text-ink-3">–</span> : fmtPts(v?.points ?? 0)}
          </td>
        );
      })}
      <td className="r font-semibold">{fmtPts(e.entry.totalPoints)}</td>
    </tr>
  );
}

export default async function SeasonPage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const s = await getStore();
  const v = seasonView(s, Number(year));
  if (!v) notFound();
  const { season, standings, sessions, awards, flags } = v;
  const gap = standings.length === 0;
  const clubsInSeason = [...standings].sort((a, b) => a.club.sortOrder - b.club.sortOrder).map((t) => t.clubId);
  const champions = standings.filter((t) => t.isChampion);
  const nav = (
    <div className="mt-4 flex gap-4 text-sm">
      {v.prev && (
        <Link href={`/seasons/${v.prev.year}`} className="text-ink-2 hover:text-accent">
          ← {v.prev.year}
        </Link>
      )}
      {v.next && (
        <Link href={`/seasons/${v.next.year}`} className="text-ink-2 hover:text-accent">
          {v.next.year} →
        </Link>
      )}
    </div>
  );

  if (gap) {
    return (
      <>
        <PageTitle eyebrow={STATUS_LABEL[season.status]} title={season.year} lede={season.statusNote ?? "Nothing survives for this year."}>
          {nav}
        </PageTitle>
        <Empty>
          {season.status === "newspaper_only"
            ? "Newspaper reports mention the competition this year, but no scoresheet or letter has been found. If you have one, it can be added without changing anything else."
            : "No document from this year has been found. The competition is believed to have continued; the record simply does not survive."}
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageTitle
        eyebrow={`${season.eraId ? ERA_LABEL[season.eraId] : ""} · ${STATUS_LABEL[season.status]}`}
        title={
          <>
            {season.year}
            {champions.length > 0 && <span className="text-ink-2"> · {champions.map((c) => c.club.shortName).join(" & ")}</span>}
          </>
        }
        lede={season.datesText ?? undefined}
      >
        {season.note && <p className="mt-3 max-w-2xl text-ink-2">{season.note}</p>}
        {!season.standingsFinal && (
          <p className="mt-3 max-w-2xl">
            <Pill tone="brass">No final standings</Pill> <span className="text-ink-2">{season.statusNote}</span>
          </p>
        )}
        {season.standingsFinal && season.statusNote && (
          <p className="mt-3 max-w-2xl">
            <Pill tone="brass">Sheet caveat</Pill> <span className="text-ink-2">{season.statusNote}</span>
          </p>
        )}
        {nav}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold border-b-2 border-accent pb-2">{season.standingsFinal ? "Final standings" : "Points recorded"}</h2>
          <div className="tablewrap mt-4 rounded border border-line bg-paper">
            <table className="data">
              <thead>
                <tr>
                  <th></th>
                  <th>Club</th>
                  {sessions.map((x) => (
                    <th key={x.session.id} className="r" title={x.session.name}>
                      {season.eraId === "early" ? `M${x.session.ordinal}` : ["Fri", "Sat AM", "Sat PM", "Sun"][x.session.ordinal - 1]}
                    </th>
                  ))}
                  <th className="r">Final</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((t) => (
                  <tr key={t.clubId} className={t.isChampion ? "hi" : ""}>
                    <td className="w-10">
                      <Place n={t.place} />
                    </td>
                    <td>
                      <ClubName club={t.club} />
                      {t.tiedForFirst && !t.isChampion && <span className="ml-2 text-xs text-ink-2">tied, waived</span>}
                    </td>
                    {sessions.map((x) => {
                      const r = x.teams.find((tt) => tt.clubId === t.clubId);
                      return (
                        <td key={x.session.id} className="r">
                          {fmtPts(r?.points ?? null)}
                        </td>
                      );
                    })}
                    <td className="r font-semibold">{fmtPts(t.finalPoints)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {standings.some((t) => t.placeNote) && <p className="mt-2 text-sm text-ink-2">{standings.find((t) => t.placeNote)!.placeNote}</p>}
        </div>

        <div>
          <h2 className="text-2xl font-semibold border-b-2 border-accent pb-2">Sessions and venues</h2>
          <table className="data mt-4 rounded border border-line bg-paper">
            <tbody>
              {sessions.map((x) => (
                <tr key={x.session.id}>
                  <td className="font-semibold whitespace-nowrap">
                    <a href={`#${x.session.id}`} className="hover:text-accent">
                      {x.session.name}
                    </a>
                  </td>
                  <td>
                    {x.venue ? <ClubName club={x.venue} /> : <span className="text-ink-3">venue not recorded</span>}
                    {!x.session.venueCertain && <span className="ml-1 text-brass" title={x.session.venueNote ?? ""}>*</span>}
                    {!x.session.played && <span className="ml-2"><Pill tone="brass">not played</Pill></span>}
                  </td>
                  <td className="text-ink-2 whitespace-nowrap">{x.session.dateText ?? ""}</td>
                  <td className="r text-ink-2 whitespace-nowrap">
                    {x.session.matchesPerPairing} × {fmtPts(x.session.ptsPerMatch)} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {awards.length > 0 && (
            <>
              <h2 className="mt-8 text-2xl font-semibold border-b-2 border-accent pb-2">Awards</h2>
              <table className="data mt-4 rounded border border-line bg-paper">
                <tbody>
                  {awards.map((a) => (
                    <tr key={a.id}>
                      <td className="font-semibold whitespace-nowrap">{{ low_gross: "Low gross", scotch: "Scotch (foursomes)", better_ball: "Better ball" }[a.type] ?? a.type}</td>
                      <td>
                        {a.playerId && s.playerById.get(a.playerId) ? <PlayerName player={s.playerById.get(a.playerId)!} /> : a.namesText}
                        {a.club && (
                          <span className="ml-2 text-ink-2">
                            <ClubName club={a.club} />
                          </span>
                        )}
                        {a.tied && <Pill tone="brass">tie</Pill>}
                      </td>
                      <td className="r">{a.scoreText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {flags.length > 0 && (
            <div className="mt-6">
              <FlagList flags={flags} />
            </div>
          )}
        </div>
      </div>

      {sessions.some((x) => x.entries.length) ? (
        sessions.map((x) => (
          <Section
            key={x.session.id}
            id={x.session.id}
            title={x.session.name}
            aside={
              <>
                {x.venue && (
                  <>
                    at <ClubName club={x.venue} />
                    {" · "}
                  </>
                )}
                {x.session.matchesPerPairing} matches per pairing, {fmtPts(x.session.ptsPerMatch)} points each
              </>
            }
          >
            {!x.session.played ? (
              <Empty>{x.session.note ?? "This session was not played."}</Empty>
            ) : x.entries.length === 0 ? (
              <Empty>No scoresheet survives for this session.</Empty>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {standings.map((t) => {
                  const rows = x.entries.filter((e) => e.club.id === t.clubId);
                  const team = x.teams.find((tt) => tt.clubId === t.clubId);
                  return (
                    <div key={t.clubId} className="tablewrap rounded border border-line bg-paper">
                      <table className="data">
                        <thead>
                          <tr>
                            <th>
                              <ClubName club={t.club} />
                            </th>
                            <th className="r">Gross</th>
                            {clubsInSeason.map((c) => (
                              <th key={c} className="r" title={`vs ${s.clubById.get(c)!.shortName}`}>
                                {s.clubById.get(c)!.abbreviation}
                              </th>
                            ))}
                            <th className="r">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((e) => (
                            <EntryRow key={e.entry.id} e={e} clubsInSeason={clubsInSeason} />
                          ))}
                          <tr className="font-semibold">
                            <td>Session total</td>
                            <td></td>
                            {clubsInSeason.map((c) => (
                              <td key={c} className="r text-ink-2">
                                {c === t.clubId ? "" : fmtPts(rows.reduce((a, e) => a + (e.vs.find((v) => v.club.id === c)?.points ?? 0), 0))}
                              </td>
                            ))}
                            <td className="r">
                              {fmtPts(team?.points ?? null)}
                              {team && team.pointsFromRows !== null && team.points !== null && Math.abs(team.pointsFromRows - team.points) > 1e-9 && (
                                <span className="ml-1 text-brass" title={`Rows sum to ${fmtPts(team.pointsFromRows)}; the sheet records ${fmtPts(team.points)}.`}>
                                  *
                                </span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        ))
      ) : (
        <Section title="Player rows">
          <Empty>
            {season.status === "team_totals_only" && season.year >= 1995 && season.year <= 2006
              ? "Only team totals have been transcribed for this year so far. The scoresheets exist and player rows will be added."
              : "Only team results survive for this year."}
          </Empty>
        </Section>
      )}
      <p className="mt-6 text-xs text-ink-3">* An unconfirmed name (matched by surname and season) or a total that differs from the sheet. Hover for details.</p>
    </>
  );
}
