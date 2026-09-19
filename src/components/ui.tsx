import Link from "next/link";
import type { ReactNode } from "react";
import { fmtPts, fmtPct, type Club, type Player, type DataFlag, type Season } from "@/lib/data";

export function PageTitle({ eyebrow, title, lede, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8">
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</div>}
      <h1 className="mt-1 text-4xl sm:text-5xl font-semibold text-ink">{title}</h1>
      {lede && <p className="mt-3 max-w-2xl text-lg text-ink-2">{lede}</p>}
      {children}
    </div>
  );
}

export function Section({ title, aside, children, id }: { title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-accent pb-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {aside && <div className="text-sm text-ink-2">{aside}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded border border-line bg-paper p-4 ${className}`}>{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded border border-line bg-paper px-4 py-3">
      <div className="display num text-3xl font-semibold leading-none text-ink">{value}</div>
      <div className="mt-1 text-sm text-ink-2">{label}</div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export type Tone = "accent" | "brass" | "slate" | "danger";
export function Pill({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  const cls = { accent: "bg-accent-soft text-accent", brass: "bg-brass-soft text-brass", slate: "bg-slate-soft text-slate", danger: "bg-danger-soft text-danger" }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider ${cls}`}>{children}</span>;
}

export function ClubName({ club, link = true, short = true }: { club: Club; link?: boolean; short?: boolean }) {
  const inner = (
    <>
      <span className={`club-dot ${club.id}`} aria-hidden="true" />
      {short ? club.shortName : club.name}
    </>
  );
  return link ? (
    <Link href={`/clubs/${club.id}`} className="whitespace-nowrap hover:text-accent">
      {inner}
    </Link>
  ) : (
    <span className="whitespace-nowrap">{inner}</span>
  );
}

export function PlayerName({ player, unconfirmed = false }: { player: Player; unconfirmed?: boolean }) {
  return (
    <Link href={`/players/${player.id}`} className="hover:text-accent">
      {player.displayName}
      {unconfirmed && (
        <span className="ml-1 text-brass" title="This row's name was resolved by season proximity and has not been confirmed">
          *
        </span>
      )}
    </Link>
  );
}

export function SeasonLink({ season, children }: { season: Season | number; children?: ReactNode }) {
  const year = typeof season === "number" ? season : season.year;
  return (
    <Link href={`/seasons/${year}`} className="hover:text-accent">
      {children ?? year}
    </Link>
  );
}

export function Pts({ n }: { n: number | null | undefined }) {
  return <span className="num">{fmtPts(n)}</span>;
}

export function Pct({ points, available }: { points: number; available: number }) {
  return <span className="num">{fmtPct(points, available)}</span>;
}

const SEV_TONE: Record<string, Tone> = { info: "slate", warning: "brass", error: "danger" };
const KIND_LABEL: Record<string, string> = {
  sheet_note: "Sheet note",
  season_note: "Note",
  corrected: "Corrected",
  total_mismatch: "Total differs",
  total_derived: "Total rebuilt",
  h2h_imbalance: "Sheet error",
  session_total_mismatch: "Sheet error",
  session_available_mismatch: "Sheet error",
  season_sum_mismatch: "Sheet error",
  season_available_mismatch: "Sheet error",
  place_order: "Sheet error",
  venue_assumed: "Venue assumed",
  venue_unknown: "Venue unknown",
  missing_session: "Missing sheet",
  identity_ambiguous: "Name uncertain",
  identity_review: "Name uncertain",
  import_warning: "Note",
  blank_opponent_cell: "Blank cell",
  entry_player_count: "Check row",
  scoring_override: "Scoring",
};

export function FlagList({ flags, compact = false }: { flags: DataFlag[]; compact?: boolean }) {
  if (!flags.length) return null;
  return (
    <ul className={`space-y-1.5 ${compact ? "text-xs" : "text-sm"}`}>
      {flags.map((f) => (
        <li key={f.id} className="flex gap-2">
          <Pill tone={SEV_TONE[f.severity] ?? "slate"}>{KIND_LABEL[f.kind] ?? f.kind}</Pill>
          <span className="text-ink-2">{f.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2">{children}</p>;
}

export const STATUS_LABEL: Record<string, string> = {
  complete: "Full player rows",
  partial: "Partial player rows",
  team_totals_only: "Team totals only",
  newspaper_only: "Newspaper coverage only",
  no_documents: "No documents survive",
};

export function Place({ n }: { n: number | null }) {
  if (n === null) return <span className="text-ink-3">–</span>;
  const suf = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return (
    <span className="num">
      {n}
      <span className="text-ink-3">{suf}</span>
    </span>
  );
}
