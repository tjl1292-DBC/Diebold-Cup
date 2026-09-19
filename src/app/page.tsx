import Link from "next/link";
import { getStore, allTimeStandings, latestFinalSeason, seasonView, fmtPts } from "@/lib/data";
import { AskClient } from "@/app/ask/AskClient";
import { Section, ClubName, Pct, SeasonLink, Place, Pill, STATUS_LABEL } from "@/components/ui";

export default async function Home() {
  const askEnabled = !!(process.env.ANTHROPIC_API_KEY || process.env.DieboldGPT || process.env.DIEBOLDGPT);
  const s = await getStore();
  const standings = allTimeStandings(s);
  const latest = latestFinalSeason(s);
  const latestView = latest ? seasonView(s, latest.year) : null;
  const champion = latestView?.standings.filter((t) => t.isChampion) ?? [];
  const firstYear = s.seasons[0].year;
  const lastYear = s.seasons[s.seasons.length - 1].year;
  const championByYear = new Map<number, string[]>();
  for (const t of s.teamSeason) if (t.isChampion) championByYear.set(t.seasonYear, [...(championByYear.get(t.seasonYear) ?? []), t.clubId]);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Pittsburgh · since 1945</div>
          <h1 className="mt-2 text-5xl sm:text-6xl font-semibold text-ink">The Diebold Cup</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-2">
            Four clubs, one weekend a year, every match on record. The Field Club, Fox Chapel, Oakmont and Longue Vue have
            played for the cup since A.J. Diebold proposed it in the summer of 1945.
          </p>
          <div className="mt-6 max-w-xl">
            <AskClient enabled={askEnabled} compact />
            <p className="mt-3 text-sm text-ink-3">
              The historian answers only from the record and shows you the rows. Prefer to browse? Use the search box above, or <Link href="/ask" className="text-accent font-semibold">the full question page</Link>.
            </p>
          </div>
        </div>

        {latestView && (
          <div className="rounded border border-line bg-paper p-5">
            <div className="flex items-baseline justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{latest!.year} result</div>
              <SeasonLink season={latest!}>
                <span className="text-sm text-ink-2 hover:text-accent">Full season →</span>
              </SeasonLink>
            </div>
            <div className="display mt-2 text-3xl font-semibold">
              {champion.map((c) => c.club.shortName).join(" & ")}
            </div>
            {latest!.datesText && <div className="text-sm text-ink-2">{latest!.datesText}</div>}
            <table className="data mt-4">
              <tbody>
                {latestView.standings.map((t) => (
                  <tr key={t.clubId} className={t.isChampion ? "hi" : ""}>
                    <td className="w-10">
                      <Place n={t.place} />
                    </td>
                    <td>
                      <ClubName club={t.club} />
                    </td>
                    <td className="r font-semibold">{fmtPts(t.finalPoints)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Section title="All-time standings" aside={`${firstYear}–${lastYear} · ${s.seasons.filter((x) => (s.teamSeasonByYear.get(x.year)?.length ?? 0) > 0).length} seasons on record`}>
        <div className="tablewrap rounded border border-line bg-paper">
          <table className="data">
            <thead>
              <tr>
                <th>Club</th>
                <th className="r">Titles</th>
                <th className="r">Seasons</th>
                <th className="r">1st</th>
                <th className="r">2nd</th>
                <th className="r">3rd</th>
                <th className="r">4th</th>
                <th className="r">Points won</th>
                <th>Years</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.club.id}>
                  <td>
                    <ClubName club={row.club} short={false} />
                  </td>
                  <td className="r font-semibold text-lg">{row.titles}</td>
                  <td className="r">{row.seasons}</td>
                  <td className="r">{row.firsts}</td>
                  <td className="r">{row.seconds}</td>
                  <td className="r">{row.thirds}</td>
                  <td className="r">{row.fourths}</td>
                  <td className="r">
                    <Pct points={row.points} available={row.available} />
                  </td>
                  <td className="text-ink-2 whitespace-nowrap">
                    {row.firstSeason}–{row.club.lastSeason ?? "present"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">
          Points won is share of the points available in every session with a recorded total, so eras with different pairs scoring compare fairly. Ties for first are engraved for both clubs; 1953 was waived to the Field Club.
        </p>
      </Section>

      <Section title="Every season" aside={<Link href="/seasons" className="hover:text-accent">Timeline with details →</Link>}>
        <div className="flex flex-wrap gap-1">
          {s.seasons.map((season) => {
            const champs = championByYear.get(season.year) ?? [];
            const hasData = (s.teamSeasonByYear.get(season.year)?.length ?? 0) > 0;
            const title = `${season.year}: ${hasData ? (champs.length ? champs.map((c) => s.clubById.get(c)!.shortName).join(" & ") : STATUS_LABEL[season.status]) : STATUS_LABEL[season.status]}`;
            return (
              <Link
                key={season.year}
                href={`/seasons/${season.year}`}
                title={title}
                className={`relative h-9 w-9 rounded-sm border text-[0.6rem] leading-none flex items-end justify-center pb-1 num ${hasData ? "border-transparent text-white" : "border-line bg-paper text-ink-3"} ${champs.length === 1 ? `club-bg ${champs[0]}` : champs.length > 1 ? "bg-brass" : hasData ? "bg-slate" : ""}`}
              >
                {String(season.year).slice(2)}
              </Link>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {s.clubs.map((c) => (
            <span key={c.id}>
              <span className={`club-dot ${c.id}`} /> {c.shortName} title
            </span>
          ))}
          <span>
            <span className="club-dot bg-brass" /> shared title
          </span>
          <span>
            <span className="club-dot bg-slate" /> no final standings
          </span>
          <span>
            <span className="club-dot border border-line bg-paper" /> archive gap
          </span>
        </div>
      </Section>

      <Section title="Where to look">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["/leaderboards", "Leaderboards", "Career points, singles records, low rounds and the best partnerships, filterable by club and era."],
            ["/players", "Players", `${s.players.length} players across the four clubs, with every match they played.`],
            ["/clubs", "Clubs", "Titles, all-time record and rosters by era for each club."],
            ["/history", "History", "How the cup began in 1945, the founding documents, and what the archive is missing."],
          ].map(([href, title, blurb]) => (
            <Link key={href} href={href} className="rounded border border-line bg-paper p-4 hover:border-accent">
              <div className="display text-xl font-semibold">{title}</div>
              <div className="mt-1 text-sm text-ink-2">{blurb}</div>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-2">
          <Pill tone="brass">Archive gaps</Pill> No documents survive for 1955–1994 or 1996, 2011 has team totals only, and 2022 has no Friday sheet. The timeline shows each gap rather than skipping it.
        </p>
      </Section>
    </>
  );
}
