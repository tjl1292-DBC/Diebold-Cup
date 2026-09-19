import type { Metadata } from "next";
import Link from "next/link";
import { getStore, fmtPts, ERA_LABEL } from "@/lib/data";
import { PageTitle, ClubName, Pill, STATUS_LABEL } from "@/components/ui";

export const metadata: Metadata = { title: "Seasons" };

export default async function SeasonsPage() {
  const s = await getStore();
  const years = [...s.seasons].reverse();
  return (
    <>
      <PageTitle eyebrow="1945 to the present" title="Every season" lede="One row per year, including the years for which nothing survives. Gaps in the archive are shown as gaps." />
      <div className="tablewrap rounded border border-line bg-paper">
        <table className="data">
          <thead>
            <tr>
              <th>Year</th>
              <th>Era</th>
              <th>Winner</th>
              <th className="r">Points</th>
              <th>Runner-up</th>
              <th>Dates</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>
            {years.map((season) => {
              const rows = (s.teamSeasonByYear.get(season.year) ?? []).sort((a, b) => (a.place ?? 9) - (b.place ?? 9) || (b.finalPoints ?? 0) - (a.finalPoints ?? 0));
              const champs = rows.filter((t) => t.isChampion);
              const runner = rows.find((t) => t.place === 2);
              const gap = rows.length === 0;
              return (
                <tr key={season.year} className={gap ? "text-ink-3" : ""}>
                  <td className="num font-semibold">
                    <Link href={`/seasons/${season.year}`} className="hover:text-accent">
                      {season.year}
                    </Link>
                  </td>
                  <td className="text-ink-2 whitespace-nowrap">{season.eraId ? ERA_LABEL[season.eraId] : "–"}</td>
                  <td>
                    {gap ? (
                      <span className="italic">{STATUS_LABEL[season.status]}</span>
                    ) : champs.length ? (
                      <span className="flex flex-wrap gap-x-3">
                        {champs.map((c) => (
                          <ClubName key={c.clubId} club={s.clubById.get(c.clubId)!} />
                        ))}
                        {champs.length > 1 && <Pill tone="brass">shared</Pill>}
                      </span>
                    ) : (
                      <span className="italic text-ink-2">No final standings</span>
                    )}
                  </td>
                  <td className="r">{champs.length ? fmtPts(champs[0].finalPoints) : ""}</td>
                  <td>{runner && !gap ? <ClubName club={s.clubById.get(runner.clubId)!} /> : ""}</td>
                  <td className="text-ink-2 whitespace-nowrap">{season.datesText ?? ""}</td>
                  <td className="text-ink-2">
                    {!gap && STATUS_LABEL[season.status]}
                    {season.statusNote && <span className="ml-1 text-brass" title={season.statusNote}>†</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-3">† A caveat about that year&apos;s record. Open the season for details.</p>
    </>
  );
}
