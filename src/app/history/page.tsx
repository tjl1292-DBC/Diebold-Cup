import type { Metadata } from "next";
import Link from "next/link";
import { getStore, ERA_LABEL } from "@/lib/data";
import { PageTitle, Section, Pill, STATUS_LABEL } from "@/components/ui";

export const metadata: Metadata = { title: "History" };

/** Minimal Markdown: paragraphs, bullet lists, ## headings, **bold**. Enough for transcriptions. */
function renderMarkdown(md: string) {
  const blocks = md.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inline(l.replace(/^\s*[-*]\s+/, "")) }} />
          ))}
        </ul>
      );
    }
    const h = /^(#{2,3})\s+(.*)$/.exec(block.trim());
    if (h) return h[1].length === 2 ? <h2 key={i}>{h[2]}</h2> : <h3 key={i}>{h[2]}</h3>;
    return <p key={i} dangerouslySetInnerHTML={{ __html: inline(lines.join(" ")) }} />;
  });
}
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s: string) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export default async function HistoryPage() {
  const s = await getStore();
  const gaps = s.seasons.filter((x) => x.status === "newspaper_only" || x.status === "no_documents" || x.statusNote);
  // collapse consecutive years with the same status + note
  const ranges: { from: number; to: number; status: string; note: string | null }[] = [];
  for (const g of gaps) {
    const last = ranges[ranges.length - 1];
    if (last && last.to === g.year - 1 && last.status === g.status && last.note === g.statusNote) last.to = g.year;
    else ranges.push({ from: g.year, to: g.year, status: g.status, note: g.statusNote });
  }
  return (
    <>
      <PageTitle eyebrow="Founded 1945" title="History" lede="How the competition began, what the founding papers say, and an honest account of what the archive does and does not contain." />

      {s.documents.map((d) => {
        const images = JSON.parse(d.images) as { src: string; caption?: string }[];
        return (
          <Section key={d.id} id={d.id} title={d.title} aside={d.dateText ?? undefined}>
            <div className={`grid gap-6 ${images.length ? "lg:grid-cols-[1fr_1fr]" : ""}`}>
              <div className="prose">{renderMarkdown(d.body)}</div>
              {images.length > 0 && (
                <div className="space-y-4">
                  {images.map((img) => (
                    <figure key={img.src} className="rounded border border-line bg-paper p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.src} alt={img.caption ?? d.title} className="w-full" />
                      {img.caption && <figcaption className="mt-1 text-xs text-ink-2">{img.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </Section>
        );
      })}

      <Section title="How the scoring works" id="scoring">
        <div className="prose">
          <p>
            <strong>{ERA_LABEL.early}.</strong> Four matches a season, one at each club, all singles. Eight men a side, three points per opponent under Nassau scoring (front nine, back nine, overall), so nine points is a perfect day. 1945 had three clubs and three matches; Allegheny Country Club joined in 1946.
          </p>
          <p>
            <strong>{ERA_LABEL.middle}.</strong> The weekend format: Friday singles, Saturday morning foursomes (called Scotch on the older sheets), Saturday afternoon four-ball (Better Ball), Sunday singles. One club hosts each session on a fixed rotation. Only team totals have been transcribed for most of these years; 2000 and 2001 have full player rows.
          </p>
          <p>
            <strong>{ERA_LABEL.modern}.</strong> Full player rows for every session except 2011. Singles have always been worth 3 points per opponent. Pairs matches were worth 6 per opponent through 2007, 3 from 2008 to 2014, and 4 from 2015 on. That is why every leaderboard on this site divides by points available rather than adding raw totals. 2024 flipped the Saturday order.
          </p>
          <p>
            <strong>Ties.</strong> The captains agreed in 1999 that there is no playoff: tied clubs are both engraved. In 1953 the cup ended 168½–168½ and Oakmont waived the trophy, so the Field Club is recorded as winner.
          </p>
        </div>
      </Section>

      <Section title="The archive" id="archive">
        <div className="prose">
          <p>
            The record is built from the surviving scoresheets, secretary&apos;s letters and newspaper clippings held by the clubs. Every player row has been checked arithmetically: the points two clubs win off each other in a session must add to a fixed total, and each club&apos;s rows must match the recorded session total. Where a sheet is wrong and the opposing clubs&apos; sheets show the right number, the row is corrected and the correction is shown beside it. Where a sheet is wrong and cannot be resolved, the recorded number is kept and labelled.
          </p>
        </div>
        <div className="tablewrap mt-4 rounded border border-line bg-paper">
          <table className="data">
            <thead>
              <tr>
                <th>Years</th>
                <th>What survives</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((r) => (
                <tr key={r.from}>
                  <td className="num whitespace-nowrap font-semibold">
                    <Link href={`/seasons/${r.from}`} className="hover:text-accent">
                      {r.from === r.to ? r.from : `${r.from}–${r.to}`}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">
                    <Pill tone={r.status === "no_documents" ? "danger" : r.status === "newspaper_only" ? "brass" : "slate"}>{STATUS_LABEL[r.status]}</Pill>
                  </td>
                  <td className="text-ink-2">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-2">
          Still to transcribe: player rows for 1995, 1997, 1998, 1999 and 2002–2006. The 1998 and 2006 scans are cropped or faxed and their totals will be rebuilt from the per-opponent columns.
        </p>
      </Section>
    </>
  );
}
