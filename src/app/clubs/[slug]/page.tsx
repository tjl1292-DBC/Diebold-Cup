import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore, clubView, fmtPts, fmtPct, ERA_LABEL } from "@/lib/data";
import { PageTitle, Section, Stat, ClubName, SeasonLink, Place, Pill, STATUS_LABEL } from "@/components/ui";

type Params = { slug: string };

export async function generateStaticParams() {
  const s = await getStore();
  return s.clubs.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getStore();
  return { title: s.clubById.get(slug)?.name ?? "Club" };
}

export default async function ClubPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const s = await getStore();
  const v = clubView(s, slug);
  if (!v) notFound();
  const { club, standing } = v;
  return (
    <>
      <PageTitle
        eyebrow={`${standing.firstSeason}–${club.lastSeason ?? "present"}${!club.firstSeasonCertain ? " · first documented season" : ""}${club.lastSeason && !club.lastSeasonCertain ? " · last documented season" : ""}`}
        title={
          <>
            <span className={`club-dot ${club.id}`} style={{ width: 18, height: 18 }} />
            {club.name}
          </>
        }
        lede={club.seatNote ?? undefined}
      />
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Titles" value={standing.titles} sub={standing.titleYears.length ? standing.titleYears.slice(-3).join(", ") + (standing.titleYears.length > 3 ? "…" : "") : "none"} />
        <Stat label="Seasons on record" value={standing.seasons} />
        <Stat label="Finished first" value={standing.firsts} sub="incl. shared" />
        <Stat label="Finished last" value={standing.fourths} />
        <Stat label="Points won" value={fmtPct(standing.points, standing.available)} sub="of available, all recorded sessions" />
        <Stat label="Players" value={v.rosterByEra.reduce((a, r) => a + r.players.length, 0)} sub="on surviving sheets" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Section title="Season by season">
          <div className="tablewrap rounded border border-line bg-paper">
            <table className="data">
              <thead>
                <tr>
                  <th>Year</th>
                  <th></th>
                  <th className="r">Final</th>
                  <th className="r">Sessions</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {v.seasons.map((t) => (
                  <tr key={t.seasonYear} className={t.isChampion ? "hi" : ""}>
                    <td>
                      <SeasonLink season={t.seasonYear} />
                    </td>
                    <td>
                      <Place n={t.place} />
                      {t.tiedForFirst && !t.isChampion && <span className="ml-1 text-xs text-ink-2">tied, waived</span>}
                    </td>
                    <td className="r font-semibold">{fmtPts(t.finalPoints)}</td>
                    <td className="r text-ink-2">
                      {(s.teamSessionBySession && (s.sessionsByYear.get(t.seasonYear) ?? []).map((x) => fmtPts(s.teamSessionBySession.get(x.id)?.find((r) => r.clubId === club.id)?.points ?? null)).join(" · ")) || ""}
                    </td>
                    <td className="text-ink-2 text-sm">{STATUS_LABEL[t.season.status]}</td>
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
                      <td className="r font-semibold">{fmtPts(r.points)}</td>
                      <td className="r text-ink-2">{fmtPts(r.available)}</td>
                      <td className="r">{fmtPct(r.points, r.available)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink-3">From player rows only (2000, 2001, 2007–2025 except 2011).</p>
          </Section>

          <Section title="Titles">
            {standing.titleYears.length === 0 ? (
              <p className="text-ink-2">No title on record.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {standing.titleYears.map((y) => (
                  <Link key={y} href={`/seasons/${y}`} className={`club-bg ${club.id} rounded-sm px-2 py-1 text-sm font-semibold text-white num`}>
                    {y}
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {v.rosterByEra.map((r) => (
        <Section key={r.era.id} title={`Roster, ${ERA_LABEL[r.era.id]}`} aside={`${r.players.length} players`}>
          <div className="tablewrap rounded border border-line bg-paper">
            <table className="data">
              <thead>
                <tr>
                  <th>Player</th>
                  <th className="r">Seasons</th>
                  <th className="r">Matches</th>
                  <th className="r">Points</th>
                  <th className="r">Share</th>
                  <th>Years</th>
                </tr>
              </thead>
              <tbody>
                {r.players.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/players/${p.id}`} className="font-semibold hover:text-accent">
                        {p.displayName}
                      </Link>
                      {p.needsReview && <Pill tone="brass">check</Pill>}
                    </td>
                    <td className="r">{p.seasons}</td>
                    <td className="r">{p.matches}</td>
                    <td className="r">{fmtPts(p.points)}</td>
                    <td className="r">{fmtPct(p.points, p.available)}</td>
                    <td className="text-ink-2 num">{p.firstSeason === p.lastSeason ? p.firstSeason : `${p.firstSeason}–${p.lastSeason}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </>
  );
}
