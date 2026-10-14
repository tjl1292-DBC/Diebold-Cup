/**
 * Rebuild the Diebold Cup database from the workbook.
 *
 *   npm run import                     # data/source/Diebold_Cup_Results_1945-2025.xlsx -> data/diebold.db
 *   npm run import -- --source x.xlsx  # another workbook with the same tab layout
 *   npm run import -- --dry-run        # parse, resolve, write reports; touch nothing in the DB
 *
 * Idempotent: every data table is dropped and rebuilt inside one transaction.
 * Adding a season = add rows to the workbook and re-run. No migration needed.
 *
 * Reads:  data/config/*.json, data/overrides/players.yaml, content/documents/*.md
 * Writes: data/diebold.db, reports/player-resolution.md, reports/import-summary.md
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as XLSX from "xlsx";
import YAML from "yaml";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, client, schema } from "../src/db/client";
import { parseName, splitPlayers, slugify, editDistance } from "../src/lib/names";
import { resolvePlayers, displayNameFor, type Token, type Overrides, type Identity } from "../src/lib/resolve";

type Cell = string | number | null;
type Row = Cell[];

// ---------------------------------------------------------------------------
// CLI + config
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string, dflt: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.resolve(ROOT, opt("source", "data/source/Diebold_Cup_Results_1945-2025.xlsx"));
const DRY_RUN = flag("dry-run");

const readJson = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const readYaml = <T,>(p: string): T => (YAML.parse(fs.readFileSync(path.join(ROOT, p), "utf8")) ?? {}) as T;

interface ClubCfg {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  sheetLabels: string[];
  firstSeason: number;
  firstSeasonCertain?: boolean;
  lastSeason: number | null;
  lastSeasonCertain?: boolean;
  seatNote?: string;
  sortOrder: number;
}
interface ScoringCfg {
  eras: { id: string; name: string; from: number; to: number | null; description: string }[];
  singles: { ptsPerMatch: number; matchesPerPairing: number };
  pairs: { matchesPerPairing: number; ptsPerMatchByYear: { from: number; to: number | null; ptsPerMatch: number }[] };
  earlyEraMatches: { ptsPerMatch: number; matchesPerPairing: number };
  modernSlots: { ordinal: number; slot: string; defaultFormat: Format; day: string }[];
  slotOverrides: Record<string, Record<string, Format> | string>;
  sessionOverrides?: Record<string, { ptsPerMatch?: number; matchesPerPairing?: number; played?: boolean; note?: string } | string>;
}
interface SeasonsCfg {
  firstYear: number;
  gaps: { from: number; to: number; status: schema.SeasonStatus; note: string }[];
  overrides: Record<string, { standingsFinal?: boolean; placesFromFinals?: boolean; statusNote?: string }>;
  champions: Record<string, { engraved: string[]; note?: string } | string>;
}
type Format = "singles" | "foursomes" | "four_ball";

const clubsCfg = readJson<{ clubs: ClubCfg[] }>("data/config/clubs.json").clubs;
const scoring = readJson<ScoringCfg>("data/config/scoring.json");
const seasonsCfg = readJson<SeasonsCfg>("data/config/seasons.json");
const overrides = readYaml<Overrides>("data/overrides/players.yaml");
const birthdates = readYaml<{ players?: { player: string; born: string | number; approx?: boolean; source?: string }[] }>("data/overrides/birthdates.yaml").players ?? [];

const clubByLabel = new Map<string, ClubCfg>();
for (const c of clubsCfg) for (const l of c.sheetLabels) clubByLabel.set(l.toLowerCase(), c);
const clubById = new Map(clubsCfg.map((c) => [c.id, c]));

const inRange = (y: number, from: number, to: number | null) => y >= from && (to === null || y <= to);
const eraFor = (y: number) => scoring.eras.find((e) => inRange(y, e.from, e.to)) ?? null;
const pairsPts = (y: number) => {
  const r = scoring.pairs.ptsPerMatchByYear.find((r) => inRange(y, r.from, r.to));
  if (!r) throw new Error(`No pairs scoring rule covers ${y}; add one to data/config/scoring.json`);
  return r.ptsPerMatch;
};
const FORMAT_NAME: Record<Format, string> = { singles: "Singles", foursomes: "Foursomes", four_ball: "Four-Ball" };

/** Resolve a Club/Venue cell to a club id. Strips "(assumed)" and "(Four-Ball)" style qualifiers. */
function parseClubCell(cell: Cell): { clubId: string | null; certain: boolean; unknown: boolean; qualifier: string | null } {
  if (cell === null || cell === undefined) return { clubId: null, certain: true, unknown: true, qualifier: null };
  const s = String(cell).trim();
  if (s === "" || s === "?") return { clubId: null, certain: true, unknown: true, qualifier: null };
  const m = /^(.*?)\s*(?:\((.*?)\))?$/.exec(s)!;
  const base = m[1].trim();
  const qualifier = m[2] ?? null;
  const club = clubByLabel.get(base.toLowerCase());
  if (!club) throw new Error(`Unknown club label "${s}". Add it to sheetLabels in data/config/clubs.json.`);
  const assumed = qualifier !== null && /assum/i.test(qualifier);
  return { clubId: club.id, certain: !assumed, unknown: false, qualifier };
}

const num = (c: Cell): number | null => {
  if (c === null || c === undefined || c === "") return null;
  if (typeof c === "number") return c;
  const s = String(c).trim().replace("½", ".5").replace(/\s+/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const str = (c: Cell): string | null => (c === null || c === undefined ? null : String(c).trim() || null);
const isYear = (c: Cell): c is number => typeof c === "number" && Number.isInteger(c) && c >= 1900 && c <= 2200;

// ---------------------------------------------------------------------------
// Workbook
// ---------------------------------------------------------------------------

if (!fs.existsSync(SOURCE)) throw new Error(`Workbook not found: ${SOURCE}`);
const wb = XLSX.readFile(SOURCE, { cellDates: false });
const sheetRows = (name: string): Row[] => {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Workbook has no "${name}" tab`);
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: null, raw: true });
};
const headerIndex = (header: Row, pred: (h: string) => boolean, what: string): number => {
  const i = header.findIndex((h) => h !== null && pred(String(h).trim().toLowerCase()));
  if (i < 0) throw new Error(`Column not found: ${what}`);
  return i;
};

// ---- Season History --------------------------------------------------------
interface SeasonHistoryRow {
  year: number;
  place: number | null;
  clubId: string;
  rounds: (number | null)[]; // R1..R4
  final: number | null;
  dates: string | null;
  venues: string | null;
  note: string | null;
}
const shRows: SeasonHistoryRow[] = [];
{
  const rows = sheetRows("Season History");
  const h = rows[0];
  const iYear = headerIndex(h, (x) => x === "year", "Season History.Year");
  const iPlace = headerIndex(h, (x) => x === "place", "Season History.Place");
  const iClub = headerIndex(h, (x) => x === "club", "Season History.Club");
  const iR = [1, 2, 3, 4].map((n) => headerIndex(h, (x) => x.startsWith(`r${n}`), `Season History.R${n}`));
  const iFinal = headerIndex(h, (x) => x === "final", "Season History.Final");
  const iDates = headerIndex(h, (x) => x === "dates", "Season History.Dates");
  const iVenues = headerIndex(h, (x) => x.startsWith("venues"), "Season History.Venues");
  const iNote = headerIndex(h, (x) => x === "note" || x === "notes", "Season History.Note");
  for (const r of rows.slice(1)) {
    if (!isYear(r[iYear])) continue;
    const club = parseClubCell(r[iClub]);
    if (!club.clubId) throw new Error(`Season History ${r[iYear]}: blank club`);
    shRows.push({
      year: r[iYear],
      place: num(r[iPlace]),
      clubId: club.clubId,
      rounds: iR.map((i) => num(r[i])),
      final: num(r[iFinal]),
      dates: str(r[iDates]),
      venues: str(r[iVenues]),
      note: str(r[iNote]),
    });
  }
}
const shByYear = new Map<number, SeasonHistoryRow[]>();
for (const r of shRows) shByYear.set(r.year, [...(shByYear.get(r.year) ?? []), r]);

// ---- Team Summary: cross-check block, venue block, awards block -------------
const venueBlock = new Map<number, Cell[]>(); // year -> [v1..v4]
const awardsBlock: { year: number; lowGross: string | null; scotch: string | null; betterBall: string | null }[] = [];
const teamSummaryDiffs: string[] = [];
{
  const rows = sheetRows("Team Summary");
  const firstCell = (r: Row) => (r[0] === null ? "" : String(r[0]).trim().toLowerCase());
  const iVenue = rows.findIndex((r) => firstCell(r).startsWith("venue by session"));
  const iAwards = rows.findIndex((r) => firstCell(r).startsWith("individual awards"));
  // block 1: team totals (cross-check only; Season History is authoritative)
  const h = rows[0];
  const iYear = headerIndex(h, (x) => x === "year", "Team Summary.Year");
  const iClub = headerIndex(h, (x) => x === "club", "Team Summary.Club");
  const iFinal = headerIndex(h, (x) => x.startsWith("final"), "Team Summary.Final");
  const iPlace = headerIndex(h, (x) => x === "place", "Team Summary.Place");
  const iSess = [2, 3, 4, 5];
  for (const r of rows.slice(1, iVenue < 0 ? undefined : iVenue)) {
    if (!isYear(r[iYear])) continue;
    const clubId = parseClubCell(r[iClub]).clubId!;
    const sh = shByYear.get(r[iYear])?.find((x) => x.clubId === clubId);
    if (!sh) {
      teamSummaryDiffs.push(`${r[iYear]} ${clubId}: in Team Summary but not Season History`);
      continue;
    }
    const a = [...iSess.map((i) => num(r[i])), num(r[iFinal]), num(r[iPlace])];
    const b = [...sh.rounds, sh.final, sh.place];
    if (a.some((v, i) => v !== b[i])) teamSummaryDiffs.push(`${r[iYear]} ${clubId}: Team Summary ${a.join("/")} vs Season History ${b.join("/")}`);
  }
  if (iVenue >= 0) {
    for (const r of rows.slice(iVenue + 2)) {
      if (!isYear(r[0])) break;
      venueBlock.set(r[0], [r[1], r[2], r[3], r[4]]);
    }
  }
  if (iAwards >= 0) {
    for (const r of rows.slice(iAwards + 2)) {
      if (!isYear(r[0])) break;
      awardsBlock.push({ year: r[0], lowGross: str(r[1]), scotch: str(r[2]), betterBall: str(r[3]) });
    }
  }
}

// ---- Sessions tab: weekend dates for years Season History leaves blank -------------
const sessionDates = new Map<number, string>();
if (wb.Sheets["Sessions"]) {
  const rows = sheetRows("Sessions");
  const h = rows[0];
  const iYear = headerIndex(h, (x) => x === "year", "Sessions.Year");
  const iDates = h.findIndex((x) => x !== null && String(x).trim().toLowerCase() === "dates");
  if (iDates >= 0) for (const r of rows.slice(1)) if (isYear(r[iYear]) && str(r[iDates])) sessionDates.set(r[iYear], str(r[iDates])!);
}

// ---- Player Results ------------------------------------------------------------
interface PlayerRow {
  source: string;
  sheetRow: number;
  year: number;
  sessionLabel: string;
  ordinal: number;
  format: Format;
  venue: ReturnType<typeof parseClubCell>;
  clubId: string;
  players: string;
  gross: number | null;
  vs: Map<string, number | null>; // opponent club id -> points
  ownCell: Cell;
  total: number | null;
  note: string | null;
}
const playerRows: PlayerRow[] = [];
/** Ingest rows in the Player Results layout from any sheet (the workbook tab or a per-year file). */
function ingestPlayerRows(rows: Row[], source: string) {
  const h = rows[0];
  const iYear = headerIndex(h, (x) => x === "year", "Player Results.Year");
  const iSession = headerIndex(h, (x) => x === "session", "Player Results.Session");
  const iVenue = headerIndex(h, (x) => x === "venue", "Player Results.Venue");
  const iClub = headerIndex(h, (x) => x === "club", "Player Results.Club");
  const iPlayers = headerIndex(h, (x) => x.startsWith("player"), "Player Results.Player(s)");
  const iGross = headerIndex(h, (x) => x === "gross", "Player Results.Gross");
  const iTotal = headerIndex(h, (x) => x.startsWith("total"), "Player Results.Total Pts");
  const iNote = headerIndex(h, (x) => x === "notes" || x === "note", "Player Results.Notes");
  const vsCols: { i: number; clubId: string }[] = [];
  h.forEach((cell, i) => {
    const s = cell === null ? "" : String(cell).trim();
    if (/^vs\s+/i.test(s)) {
      const club = parseClubCell(s.replace(/^vs\s+/i, ""));
      if (!club.clubId) throw new Error(`Cannot map column "${s}" to a club`);
      vsCols.push({ i, clubId: club.clubId });
    }
  });
  if (vsCols.length < 3) throw new Error(`Expected at least three "vs <club>" columns, found ${vsCols.length}`);

  rows.slice(1).forEach((r, idx) => {
    if (!isYear(r[iYear])) return;
    const sheetRow = idx + 2;
    void source;
    const label = str(r[iSession]);
    if (!label) throw new Error(`Player Results row ${sheetRow}: blank Session`);
    const l = label.toLowerCase();
    const ordinal = l.startsWith("fri") ? 1 : l.startsWith("sat am") ? 2 : l.startsWith("sat pm") ? 3 : l.startsWith("sun") ? 4 : 0;
    if (!ordinal) throw new Error(`Player Results row ${sheetRow}: unrecognised Session "${label}"`);
    const format: Format = /singles/.test(l) ? "singles" : /foursome|scotch/.test(l) ? "foursomes" : /four[- ]?ball|better/.test(l) ? "four_ball" : "singles";
    const club = parseClubCell(r[iClub]);
    if (!club.clubId) throw new Error(`Player Results row ${sheetRow}: blank Club`);
    const players = str(r[iPlayers]);
    if (!players) throw new Error(`Player Results row ${sheetRow}: blank Player(s)`);
    const vs = new Map<string, number | null>();
    let ownCell: Cell = null;
    for (const c of vsCols) {
      if (c.clubId === club.clubId) ownCell = r[c.i];
      else vs.set(c.clubId, num(r[c.i]));
    }
    playerRows.push({
      source,
      sheetRow,
      year: r[iYear],
      sessionLabel: label,
      ordinal,
      format,
      venue: parseClubCell(r[iVenue]),
      clubId: club.clubId,
      players,
      gross: num(r[iGross]),
      vs,
      ownCell,
      total: num(r[iTotal]),
      note: str(r[iNote]),
    });
  });
}
ingestPlayerRows(sheetRows("Player Results"), "Player Results");

// Per-year files with the same columns, in data/source/seasons/ (csv or xlsx).
// Add a year without touching the workbook: drop 2003.csv in and re-run.
{
  const dir = path.join(ROOT, "data/source/seasons");
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => /\.(csv|xlsx)$/i.test(x)).sort()) {
      const wbx = XLSX.readFile(path.join(dir, f), { cellDates: false });
      const ws = wbx.Sheets[wbx.SheetNames.includes("Player Results") ? "Player Results" : wbx.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: null, raw: true });
      const before = playerRows.length;
      ingestPlayerRows(rows, f);
      console.log(`  + ${f}: ${playerRows.length - before} player rows`);
    }
  }
}

// ---- Corrections (data/overrides/corrections.yaml) --------------------------------
interface Correction {
  year: number;
  session: string;
  club: string;
  player: string;
  set: Record<string, number | null>;
  reason: string;
  evidence?: string;
}
const corrections = readYaml<{ corrections?: Correction[] }>("data/overrides/corrections.yaml").corrections ?? [];
const correctionNotes = new Map<PlayerRow, string[]>();
const ordinalOfLabel = (label: string) => {
  const l = label.toLowerCase();
  return l.startsWith("fri") ? 1 : l.startsWith("sat am") ? 2 : l.startsWith("sat pm") ? 3 : l.startsWith("sun") ? 4 : 0;
};
for (const c of corrections) {
  const clubId = parseClubCell(c.club).clubId;
  const ordinal = ordinalOfLabel(c.session);
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const matches = playerRows.filter((r) => r.year === c.year && r.ordinal === ordinal && r.clubId === clubId && norm(r.players) === norm(c.player));
  if (matches.length !== 1) throw new Error(`corrections.yaml: ${c.year} ${c.session} ${c.club} "${c.player}" matched ${matches.length} rows (need exactly 1)`);
  const r = matches[0];
  const changes: string[] = [];
  for (const [field, value] of Object.entries(c.set)) {
    const f = field.trim().toLowerCase();
    if (f === "gross") { changes.push(`gross ${r.gross ?? "blank"} → ${value ?? "blank"}`); r.gross = value; continue; }
    if (f === "total" || f === "total pts") { changes.push(`total ${r.total ?? "blank"} → ${value ?? "blank"}`); r.total = value; continue; }
    if (f.startsWith("vs ")) {
      const opp = parseClubCell(field.trim().slice(3)).clubId;
      if (!opp || !r.vs.has(opp)) throw new Error(`corrections.yaml: ${c.year} "${c.player}": "${field}" is not an opponent column for ${c.club}`);
      changes.push(`vs ${clubById.get(opp)!.shortName} ${r.vs.get(opp) ?? "blank"} → ${value ?? "blank"}`);
      r.vs.set(opp, value);
      continue;
    }
    throw new Error(`corrections.yaml: unknown field "${field}"`);
  }
  // the sheet's Total Pts no longer applies once components change; keep it only if it still agrees
  const newSum = [...r.vs.values()].reduce((a: number, b) => a + (b ?? 0), 0);
  const recordedTotal: number | null = r.total;
  if (recordedTotal !== null && Math.abs(recordedTotal - newSum) > 1e-9) r.total = null;
  correctionNotes.set(r, [`${changes.join("; ")}. ${c.reason}${c.evidence ? ` ${c.evidence}` : ""}`]);
}

// ---------------------------------------------------------------------------
// Build rows for every table
// ---------------------------------------------------------------------------

type Insert<T extends keyof typeof schema> = (typeof schema)[T] extends { $inferInsert: infer I } ? I : never;
const out = {
  clubs: [] as Insert<"clubs">[],
  eras: [] as Insert<"eras">[],
  seasons: [] as Insert<"seasons">[],
  sessions: [] as Insert<"sessions">[],
  teamSessionResults: [] as Insert<"teamSessionResults">[],
  teamSeasonResults: [] as Insert<"teamSeasonResults">[],
  players: [] as Insert<"players">[],
  playerAliases: [] as Insert<"playerAliases">[],
  entries: [] as Insert<"entries">[],
  entryPlayers: [] as Insert<"entryPlayers">[],
  entryOpponentPoints: [] as Insert<"entryOpponentPoints">[],
  awards: [] as Insert<"awards">[],
  dataFlags: [] as Insert<"dataFlags">[],
  documents: [] as Insert<"documents">[],
};
let flagSeq = 0;
const addFlag = (f: Omit<Insert<"dataFlags">, "id" | "source"> & { source?: string }) => {
  out.dataFlags.push({ id: `sheet-${++flagSeq}`, source: "sheet", ...f });
};

// ---- clubs + eras
for (const c of clubsCfg) {
  out.clubs.push({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    abbreviation: c.abbreviation,
    firstSeason: c.firstSeason,
    firstSeasonCertain: c.firstSeasonCertain ?? true,
    lastSeason: c.lastSeason,
    lastSeasonCertain: c.lastSeasonCertain ?? true,
    seatNote: c.seatNote ?? null,
    sortOrder: c.sortOrder,
  });
}
for (const e of scoring.eras) out.eras.push({ id: e.id, name: e.name, fromYear: e.from, toYear: e.to, description: e.description });

// ---- seasons + sessions
const rowsByYearOrdinal = new Map<string, PlayerRow[]>();
for (const r of playerRows) {
  const k = `${r.year}-${r.ordinal}`;
  rowsByYearOrdinal.set(k, [...(rowsByYearOrdinal.get(k) ?? []), r]);
}
const yearsWithRows = new Set(playerRows.map((r) => r.year));
const lastYear = Math.max(...shRows.map((r) => r.year), ...playerRows.map((r) => r.year));
interface SessionInfo {
  id: string;
  year: number;
  ordinal: number;
  format: Format;
  ptsPerMatch: number;
  matchesPerPairing: number;
  playersPerEntry: number;
  clubIds: string[];
}
const sessionInfo = new Map<string, SessionInfo>();

for (let year = seasonsCfg.firstYear; year <= lastYear; year++) {
  const sh = shByYear.get(year) ?? [];
  const ov = seasonsCfg.overrides[String(year)] ?? {};
  const era = eraFor(year);
  if (sh.length === 0) {
    if (yearsWithRows.has(year)) throw new Error(`${year} has player rows but no Season History rows`);
    const gap = seasonsCfg.gaps.find((g) => year >= g.from && year <= g.to);
    if (!gap) throw new Error(`${year} is missing from Season History and not covered by a gap in data/config/seasons.json`);
    out.seasons.push({ year, eraId: era?.id ?? null, status: gap.status, standingsFinal: false, hasPlayerRows: false, clubCount: null, datesText: null, note: null, statusNote: ov.statusNote ?? gap.note });
    continue;
  }
  const clubIds = sh.map((r) => r.clubId);
  const clubCount = clubIds.length;
  const isEarly = era?.id === "early";
  const sessionCount = isEarly ? clubCount : scoring.modernSlots.length;
  const sessionsWithRows = [...Array(sessionCount).keys()].filter((i) => rowsByYearOrdinal.has(`${year}-${i + 1}`)).length;
  const sessionsPlayed = [...Array(sessionCount).keys()].filter((i) => {
    const so = scoring.sessionOverrides?.[`${year}-${i + 1}`];
    return !(typeof so === "object" && so.played === false);
  }).length;
  const status: schema.SeasonStatus = sessionsWithRows === 0 ? "team_totals_only" : sessionsWithRows >= sessionsPlayed ? "complete" : "partial";
  const standingsFinal = ov.standingsFinal ?? sh.every((r) => r.place !== null);
  out.seasons.push({
    year,
    eraId: era?.id ?? null,
    status,
    standingsFinal,
    hasPlayerRows: sessionsWithRows > 0,
    clubCount,
    datesText: sh[0].dates ?? sessionDates.get(year) ?? null,
    note: sh[0].note,
    statusNote: ov.statusNote ?? null,
  });
  if (ov.statusNote) addFlag({ kind: "season_note", severity: "warning", seasonYear: year, message: ov.statusNote });
  if (sh[0].note) addFlag({ kind: "season_note", severity: "info", seasonYear: year, message: sh[0].note });

  // venues: rows > Team Summary venue block > Season History Venues column
  const venuesText = sh[0].venues ? sh[0].venues.split(",").map((s) => s.trim()) : [];
  const vb = venueBlock.get(year);
  // early-era per-match dates: "May 12, Jun 9, Jun 30, Aug 4, 1949"
  let matchDates: string[] | null = null;
  if (isEarly && sh[0].dates) {
    const parts = sh[0].dates.split(",").map((s) => s.trim());
    const yr = parts[parts.length - 1];
    if (/^\d{4}$/.test(yr) && parts.length - 1 === sessionCount) matchDates = parts.slice(0, -1).map((d) => `${d}, ${yr}`);
  }

  for (let ordinal = 1; ordinal <= sessionCount; ordinal++) {
    const id = `${year}-${ordinal}`;
    const rows = rowsByYearOrdinal.get(id) ?? [];
    let format: Format;
    let slot: string;
    let name: string;
    let sheetLabel: string | null = null;
    if (isEarly) {
      format = "singles";
      slot = "match";
      name = `Match ${ordinal}`;
    } else {
      const cfgSlot = scoring.modernSlots[ordinal - 1];
      const so = scoring.slotOverrides[String(year)];
      const cfgFormat: Format = (typeof so === "object" && so?.[String(ordinal)]) || cfgSlot.defaultFormat;
      format = cfgFormat;
      slot = cfgSlot.slot;
      if (rows.length) {
        const labels = [...new Set(rows.map((r) => r.sessionLabel))];
        if (labels.length > 1) addFlag({ kind: "import_warning", severity: "warning", seasonYear: year, sessionId: id, message: `Mixed Session labels in one slot: ${labels.join(" | ")}` });
        sheetLabel = labels[0];
        const rowFormat = rows[0].format;
        if (rowFormat !== cfgFormat) {
          addFlag({ kind: "import_warning", severity: "warning", seasonYear: year, sessionId: id, message: `Sheet says ${FORMAT_NAME[rowFormat]} but config expects ${FORMAT_NAME[cfgFormat]}; using the sheet. Add a slotOverride if this is right.` });
          format = rowFormat;
        }
      } else {
        sheetLabel = `${cfgSlot.slot === "fri" ? "Fri" : cfgSlot.slot === "sat_am" ? "Sat AM" : cfgSlot.slot === "sat_pm" ? "Sat PM" : "Sun"} ${FORMAT_NAME[format]}`;
      }
      name = `${cfgSlot.day} ${FORMAT_NAME[format]}`;
    }
    const isSingles = format === "singles";
    const so = scoring.sessionOverrides?.[id];
    const sessionOverride = typeof so === "object" ? so : null;
    const ptsPerMatch = sessionOverride?.ptsPerMatch ?? (isEarly ? scoring.earlyEraMatches.ptsPerMatch : isSingles ? scoring.singles.ptsPerMatch : pairsPts(year));
    const matchesPerPairing = sessionOverride?.matchesPerPairing ?? (isEarly ? scoring.earlyEraMatches.matchesPerPairing : isSingles ? scoring.singles.matchesPerPairing : scoring.pairs.matchesPerPairing);
    const played = sessionOverride?.played ?? true;
    if (sessionOverride && (sessionOverride.ptsPerMatch !== undefined || sessionOverride.matchesPerPairing !== undefined)) addFlag({ kind: "scoring_override", severity: "info", seasonYear: year, sessionId: id, message: `Scoring overridden in config: ${matchesPerPairing} matches x ${ptsPerMatch} pts per pairing.${sessionOverride.note ? ` ${sessionOverride.note}` : ""}` });
    if (!played) addFlag({ kind: "session_not_played", severity: "info", seasonYear: year, sessionId: id, message: sessionOverride?.note ?? `${name} ${year} was not played.` });
    const playersPerEntry = isSingles ? 1 : 2;

    // venue
    let venue = { clubId: null as string | null, certain: true, unknown: true, qualifier: null as string | null };
    let venueNote: string | null = null;
    const rowVenues = [...new Set(rows.map((r) => r.venue.clubId).filter((v): v is string => v !== null))];
    if (rowVenues.length > 1) addFlag({ kind: "import_warning", severity: "warning", seasonYear: year, sessionId: id, message: `Rows disagree on venue: ${rowVenues.join(", ")}` });
    if (rowVenues.length >= 1) {
      venue = rows.find((r) => r.venue.clubId === rowVenues[0])!.venue;
      if (vb && parseClubCell(vb[ordinal - 1]).clubId && parseClubCell(vb[ordinal - 1]).clubId !== rowVenues[0]) {
        addFlag({ kind: "import_warning", severity: "warning", seasonYear: year, sessionId: id, message: `Row venue ${rowVenues[0]} differs from Team Summary venue block (${vb[ordinal - 1]})` });
      }
    } else if (vb && vb[ordinal - 1] !== null) {
      venue = parseClubCell(vb[ordinal - 1]);
    } else if (venuesText[ordinal - 1] !== undefined) {
      venue = parseClubCell(venuesText[ordinal - 1]);
    }
    if (!venue.certain) {
      venueNote = `Venue assumed from the rotation (${venue.qualifier}); no sheet confirms it.`;
      addFlag({ kind: "venue_assumed", severity: "info", seasonYear: year, sessionId: id, clubId: venue.clubId, message: venueNote });
    } else if (venue.unknown) {
      venueNote = "Venue not recorded.";
      addFlag({ kind: "venue_unknown", severity: "info", seasonYear: year, sessionId: id, message: `${name} ${year}: venue not recorded.` });
    }
    if (rows.length === 0 && sessionsWithRows > 0 && played) {
      addFlag({ kind: "missing_session", severity: "warning", seasonYear: year, sessionId: id, message: `${name} ${year}: no scoresheet survives; player rows exist for the other sessions.` });
    }

    out.sessions.push({
      id,
      seasonYear: year,
      ordinal,
      slot,
      format,
      name,
      sheetLabel,
      venueClubId: venue.clubId,
      venueCertain: venue.certain,
      venueNote,
      dateText: matchDates ? matchDates[ordinal - 1] : null,
      ptsPerMatch,
      matchesPerPairing,
      playersPerEntry,
      hasPlayerRows: rows.length > 0,
      played,
      note: sessionOverride?.note ?? null,
    });
    sessionInfo.set(id, { id, year, ordinal, format, ptsPerMatch, matchesPerPairing, playersPerEntry, clubIds });

    for (const r of sh) {
      out.teamSessionResults.push({
        sessionId: id,
        clubId: r.clubId,
        points: r.rounds[ordinal - 1] ?? null,
        pointsFromRows: null, // filled after entries
        available: played ? (clubCount - 1) * matchesPerPairing * ptsPerMatch : 0,
      });
    }
  }
  if (isEarly) {
    const hosts = [...Array(sessionCount).keys()].map((i) => out.sessions.find((s) => s.id === `${year}-${i + 1}`)!.venueClubId).filter(Boolean);
    const dup = hosts.filter((h, i) => hosts.indexOf(h) !== i);
    if (dup.length) addFlag({ kind: "import_warning", severity: "warning", seasonYear: year, message: `Venues list a club twice (${dup.join(", ")}); each club should host once.` });
  }

  // team season results
  const champCfg = seasonsCfg.champions[String(year)];
  const engraved = typeof champCfg === "object" ? champCfg.engraved : null;
  if (ov.placesFromFinals && sh.every((r) => r.place === null && r.final !== null)) {
    const sorted = [...sh].sort((a, b) => (b.final ?? 0) - (a.final ?? 0));
    sorted.forEach((r, i) => {
      r.place = i > 0 && Math.abs((sorted[i - 1].final ?? 0) - (r.final ?? 0)) < 1e-9 ? sorted[i - 1].place : i + 1;
    });
  }
  const firstPlaces = sh.filter((r) => r.place === 1).length;
  for (const r of sh) {
    const allRecorded = r.rounds.slice(0, sessionCount).every((v) => v !== null);
    const sum = allRecorded ? r.rounds.slice(0, sessionCount).reduce((a: number, b) => a + (b ?? 0), 0) : null;
    const tied = r.place === 1 && firstPlaces > 1;
    out.teamSeasonResults.push({
      seasonYear: year,
      clubId: r.clubId,
      finalPoints: r.final,
      sumOfSessions: sum,
      place: standingsFinal ? r.place : null,
      isChampion: standingsFinal && (engraved ? engraved.includes(r.clubId) : r.place === 1),
      tiedForFirst: tied,
      placeNote: tied && typeof champCfg === "object" ? champCfg.note ?? null : tied ? "Tied for first; both clubs engraved (no playoff, by the captains' 1999 agreement)." : null,
    });
  }
}

// ---- entries
const lineCounters = new Map<string, number>();
const tokens: Token[] = [];
const entryMeta = new Map<string, { year: number; sessionId: string; clubId: string; raw: string; sheetRow: number; format: Format }>();
for (const r of playerRows) {
  const sessionId = `${r.year}-${r.ordinal}`;
  const s = sessionInfo.get(sessionId);
  if (!s) throw new Error(`Row ${r.sheetRow}: session ${sessionId} was not built`);
  if (!s.clubIds.includes(r.clubId)) throw new Error(`Row ${r.sheetRow}: ${r.clubId} is not in the ${r.year} Season History`);
  const lk = `${sessionId}-${r.clubId}`;
  const lineNo = (lineCounters.get(lk) ?? 0) + 1;
  lineCounters.set(lk, lineNo);
  const entryId = `${lk}-${lineNo}`;
  const opponents = s.clubIds.filter((c) => c !== r.clubId);
  let total = 0;
  for (const opp of opponents) {
    const v = r.vs.get(opp);
    if (v === undefined) throw new Error(`Row ${r.sheetRow}: no "vs" column for ${opp}`);
    if (v === null) addFlag({ kind: "blank_opponent_cell", severity: "warning", seasonYear: r.year, sessionId, clubId: r.clubId, entryId, message: `vs ${clubById.get(opp)!.shortName} is blank; treated as 0.` });
    total += v ?? 0;
    out.entryOpponentPoints.push({ entryId, opponentClubId: opp, points: v ?? 0, available: s.ptsPerMatch });
  }
  if (r.ownCell !== null) addFlag({ kind: "import_warning", severity: "warning", seasonYear: r.year, sessionId, clubId: r.clubId, entryId, message: `Own-club column is not blank (${r.ownCell}).` });
  const recorded: number | null = r.total;
  const derived = recorded === null;
  if (recorded === null) { if (!correctionNotes.has(r)) addFlag({ kind: "total_derived", severity: "info", seasonYear: r.year, sessionId, clubId: r.clubId, entryId, message: `Total Pts blank on the sheet; rebuilt from the per-opponent columns (${total}).` }); }
  else if (Math.abs(recorded - total) > 1e-9) addFlag({ kind: "total_mismatch", severity: "warning", seasonYear: r.year, sessionId, clubId: r.clubId, entryId, message: `Total Pts reads ${r.total} but the per-opponent columns sum to ${total}. Site uses ${total}.` });
  for (const note of correctionNotes.get(r) ?? []) addFlag({ kind: "corrected", severity: "info", seasonYear: r.year, sessionId, clubId: r.clubId, entryId, message: `Corrected against the opposing clubs' sheets: ${note}` });
  if (r.note) addFlag({ kind: "sheet_note", severity: /faint|low confidence|ambiguous/i.test(r.note) ? "warning" : "info", seasonYear: r.year, sessionId, clubId: r.clubId, entryId, message: r.note });

  out.entries.push({
    id: entryId,
    sessionId,
    clubId: r.clubId,
    lineNo,
    rawNames: r.players,
    gross: r.gross === null ? null : Math.round(r.gross),
    totalRecorded: r.total,
    totalPoints: total,
    available: opponents.length * s.ptsPerMatch,
    totalDerived: derived,
    sheetNote: r.note,
    sourceRef: `${r.source}!${r.sheetRow}`,
  });
  entryMeta.set(entryId, { year: r.year, sessionId, clubId: r.clubId, raw: r.players, sheetRow: r.sheetRow, format: s.format });

  const names = splitPlayers(r.players);
  if (names.length !== s.playersPerEntry) {
    addFlag({ kind: "entry_player_count", severity: "error", seasonYear: r.year, sessionId, clubId: r.clubId, entryId, message: `Expected ${s.playersPerEntry} name(s) for ${FORMAT_NAME[s.format]}, found ${names.length}: "${r.players}"` });
  }
  names.forEach((raw, i) => tokens.push({ key: `${entryId}:${i + 1}`, clubId: r.clubId, raw, year: r.year }));
}
// pointsFromRows
{
  const sums = new Map<string, number>();
  for (const e of out.entries) sums.set(`${e.sessionId}|${e.clubId}`, (sums.get(`${e.sessionId}|${e.clubId}`) ?? 0) + e.totalPoints);
  for (const t of out.teamSessionResults) {
    const v = sums.get(`${t.sessionId}|${t.clubId}`);
    if (v !== undefined) t.pointsFromRows = v;
  }
}

// ---- players
const resolved = resolvePlayers(tokens, overrides);
const identityById = new Map(resolved.identities.map((i) => [i.id, i]));
for (const id of resolved.identities) {
  const given = [...id.givenSpellings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const surname = [...id.surnameSpellings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? id.surnameKey;
  const years = id.years;
  out.players.push({
    id: id.id,
    clubId: id.clubId,
    displayName: displayNameFor(id),
    givenName: given,
    initials: id.initials,
    surname,
    suffix: id.suffix,
    sortName: [id.surnameKey, given?.toLowerCase() ?? id.initials?.toLowerCase() ?? "", id.suffix?.toLowerCase() ?? ""].join(", ").replace(/, $/, ""),
    personId: id.personId,
    firstSeason: years.length ? Math.min(...years) : null,
    lastSeason: years.length ? Math.max(...years) : null,
    source: id.source,
    needsReview: id.needsReview,
    reviewNote: id.reviewNote,
    note: id.note ?? null,
  });
  if (id.needsReview) addFlag({ kind: "identity_review", severity: "warning", playerId: id.id, message: `${displayNameFor(id)}: ${id.reviewNote}` });
}
// Birth dates from birthdates.yaml; a date set on one Player row is copied to
// the same person's rows at other clubs.
{
  const byId = new Map(out.players.map((p) => [p.id, p]));
  for (const b of birthdates) {
    const p = byId.get(b.player);
    if (!p) throw new Error(`birthdates.yaml names unknown player id "${b.player}".`);
    const born = String(b.born);
    const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(born);
    if (!m) throw new Error(`birthdates.yaml: "${born}" for ${b.player} is not YYYY, YYYY-MM or YYYY-MM-DD.`);
    p.birthDate = born;
    p.birthYear = Number(m[1]);
    p.birthYearApprox = !!b.approx;
    p.birthSource = b.source ?? null;
  }
  for (const p of out.players) {
    if (p.birthYear != null || !p.personId) continue;
    const src = out.players.find((q) => q.personId === p.personId && q.birthYear != null);
    if (src) Object.assign(p, { birthDate: src.birthDate, birthYear: src.birthYear, birthYearApprox: src.birthYearApprox, birthSource: src.birthSource });
  }
}
const aliasAgg = new Map<string, Insert<"playerAliases">>();
for (const t of tokens) {
  const a = resolved.assignments.get(t.key);
  if (!a) throw new Error(`Token ${t.key} (${t.raw}) was not resolved`);
  const [entryId, pos] = t.key.split(":");
  out.entryPlayers.push({
    entryId,
    playerId: a.identity.id,
    position: Number(pos),
    rawName: t.raw,
    method: a.method,
    confidence: a.confidence,
    candidates: a.candidates.length > 1 ? JSON.stringify(a.candidates.map((c) => c.id)) : null,
  });
  if (a.confidence === "low") {
    const m = entryMeta.get(entryId)!;
    addFlag({
      kind: "identity_ambiguous",
      severity: "warning",
      seasonYear: m.year,
      sessionId: m.sessionId,
      clubId: m.clubId,
      entryId,
      playerId: a.identity.id,
      message: `"${t.raw}" could be ${a.candidates.map((c) => displayNameFor(c)).join(" or ")}; assigned to ${displayNameFor(a.identity)} by season proximity.`,
    });
  }
  const k = `${t.clubId}|${t.raw}|${a.identity.id}`;
  const agg = aliasAgg.get(k);
  if (agg) {
    agg.occurrences += 1;
    agg.firstYear = Math.min(agg.firstYear, t.year);
    agg.lastYear = Math.max(agg.lastYear, t.year);
  } else {
    aliasAgg.set(k, { playerId: a.identity.id, clubId: t.clubId, rawName: t.raw, occurrences: 1, firstYear: t.year, lastYear: t.year, source: a.method === "override" ? "override" : "auto" });
  }
}
out.playerAliases.push(...aliasAgg.values());
for (const w of resolved.warnings) addFlag({ kind: "import_warning", severity: "warning", message: w });
for (const d of teamSummaryDiffs) addFlag({ kind: "import_warning", severity: "warning", message: `Team Summary disagrees with Season History: ${d}` });

// ---- awards
{
  const abbr = new Map(clubsCfg.map((c) => [c.abbreviation.toLowerCase(), c.id]));
  const parseAward = (year: number, type: string, cell: string | null) => {
    if (!cell || /not in file/i.test(cell)) return;
    // "Sutherland/Sullivan Jr & R. Wagner/Spatz (OCC) 73 (tie)"  -> one club, two pairs
    // "Opitz/Marous (PFC) & Betts/Kreps (LVC) 74 (tie)"          -> two clubs, one award row each
    const tail = /^(.*?)\s*([\d\-½.]+)?\s*(\(tie\))?\s*$/.exec(cell)!;
    const scoreText = tail[2] ?? null;
    const tied = !!tail[3];
    const parts = tail[1].split(/\s*&\s*/);
    const parsedParts = parts.map((p) => {
      const m = /^(.*?)\s*\(([A-Za-z]+)\)\s*$/.exec(p);
      return { namesText: m ? m[1].trim() : p.trim(), clubId: m ? abbr.get(m[2].toLowerCase()) ?? null : null };
    });
    // a trailing club applies to every earlier part that has none
    for (let i = parsedParts.length - 2; i >= 0; i--) if (!parsedParts[i].clubId) parsedParts[i].clubId = parsedParts[i + 1].clubId;
    const groups = new Map<string | null, string[]>();
    for (const pp of parsedParts) groups.set(pp.clubId, [...(groups.get(pp.clubId) ?? []), pp.namesText]);
    let n = 0;
    for (const [clubId, names] of groups) {
      const id = groups.size > 1 ? `${year}-${type}-${++n}` : `${year}-${type}`;
      const namesText = names.join(" & ");
      let entryId: string | null = null;
      let playerId: string | null = null;
      const wantSurnames = (p: string) => splitPlayers(p).map((x) => parseName(x).surnameKey);
      if (clubId) {
        if (type === "low_gross") {
          const want = wantSurnames(names[0]);
          const cand = out.players.filter((p) => p.clubId === clubId && want.includes(parseName(p.surname).surnameKey) && (p.firstSeason ?? 0) <= year && (p.lastSeason ?? 9999) >= year);
          if (cand.length === 1) playerId = cand[0].id;
        } else {
          const fmt: Format = type === "scotch" ? "foursomes" : "four_ball";
          const session = out.sessions.find((s) => s.seasonYear === year && s.format === fmt);
          const want = wantSurnames(names[0]);
          if (session) {
            const cand = out.entries.filter((e) => e.sessionId === session.id && e.clubId === clubId).filter((e) => {
              const have = splitPlayers(e.rawNames).map((x) => parseName(x).surnameKey);
              return want.every((w) => have.includes(w));
            });
            if (cand.length === 1) entryId = cand[0].id;
          }
        }
        if (!entryId && !playerId && yearsWithRows.has(year)) {
          addFlag({ kind: "import_warning", severity: "info", seasonYear: year, message: `Award "${cell}" (${type}) could not be matched to a scoresheet line.` });
        }
      }
      out.awards.push({ id, seasonYear: year, type, clubId, description: cell, namesText, scoreText, tied, entryId, playerId });
    }
  };
  for (const a of awardsBlock) {
    parseAward(a.year, "low_gross", a.lowGross);
    parseAward(a.year, "scotch", a.scotch);
    parseAward(a.year, "better_ball", a.betterBall);
  }
}

// ---- documents (content/documents/*.md with YAML front matter)
{
  const dir = path.join(ROOT, "content/documents");
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
    files.forEach((f, i) => {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
      const fm = (m ? YAML.parse(m[1]) : {}) ?? {};
      const body = m ? m[2].trim() : text.trim();
      out.documents.push({
        id: fm.id ?? slugify(f.replace(/\.md$/, "")),
        title: fm.title ?? f,
        kind: fm.kind ?? "other",
        dateText: fm.date ?? null,
        sortOrder: fm.order ?? i + 1,
        body,
        images: JSON.stringify(fm.images ?? []),
        summary: fm.summary ?? null,
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const sourceSha = crypto.createHash("sha256").update(fs.readFileSync(SOURCE)).digest("hex");
const now = new Date().toISOString();
fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });

{
  const L: string[] = [];
  const byId = identityById;
  const spanOf = (i: Identity) => (i.years.length ? `${Math.min(...i.years)}-${Math.max(...i.years)}` : "-");
  const label = (i: Identity) => `${displayNameFor(i)} (${i.id}, ${spanOf(i)}, ${i.tokenCount} rows)`;
  L.push(`# Player resolution report`, ``, `Generated ${now} from \`${path.basename(SOURCE)}\` (sha256 ${sourceSha.slice(0, 12)}).`, ``);
  const methods = new Map<string, number>();
  const confs = new Map<string, number>();
  for (const a of resolved.assignments.values()) {
    methods.set(a.method, (methods.get(a.method) ?? 0) + 1);
    confs.set(a.confidence, (confs.get(a.confidence) ?? 0) + 1);
  }
  L.push(`## Summary`, ``, `| | |`, `|---|---|`, `| name tokens | ${tokens.length} |`, `| players (per club) | ${resolved.identities.length} |`);
  for (const [k, v] of [...methods].sort()) L.push(`| method: ${k} | ${v} |`);
  for (const k of ["high", "medium", "low"]) L.push(`| confidence: ${k} | ${confs.get(k) ?? 0} |`);
  L.push(``);

  const review = resolved.identities.filter((i) => i.needsReview);
  L.push(`## Needs review (${review.length})`, ``, `Suffix-less names with more than one suffixed candidate. Pin each year with an alias rule in \`data/overrides/players.yaml\`.`, ``);
  for (const i of review) L.push(`- **${label(i)}** — ${i.reviewNote}`);
  L.push(``);

  const low = [...resolved.assignments.values()].filter((a) => a.confidence === "low");
  L.push(`## Low-confidence assignments (${low.length})`, ``, `The spelling matched more than one player and season proximity could not separate them. Sorted by year.`, ``, `| Year | Session | Club | As written | Assigned to | Other candidates |`, `|---|---|---|---|---|---|`);
  for (const a of low.sort((x, y) => entryMeta.get(x.tokenKey.split(":")[0])!.year - entryMeta.get(y.tokenKey.split(":")[0])!.year)) {
    const m = entryMeta.get(a.tokenKey.split(":")[0])!;
    const others = a.candidates.filter((c) => c !== a.identity).map(label).join("; ");
    L.push(`| ${m.year} | ${m.sessionId} | ${m.clubId} | ${a.parsed.raw} | ${label(a.identity)} | ${others} |`);
  }
  L.push(``);

  const medium = [...resolved.assignments.values()].filter((a) => a.confidence === "medium" && a.method !== "suffix_merge");
  L.push(`## Resolved by season proximity (${medium.length})`, ``, `More than one candidate, but only one was active around that year. Spot-check a few.`, ``, `| Year | Club | As written | Assigned to | Other candidates |`, `|---|---|---|---|---|`);
  for (const a of medium.sort((x, y) => entryMeta.get(x.tokenKey.split(":")[0])!.year - entryMeta.get(y.tokenKey.split(":")[0])!.year)) {
    const m = entryMeta.get(a.tokenKey.split(":")[0])!;
    const others = a.candidates.filter((c) => c !== a.identity).map(label).join("; ");
    L.push(`| ${m.year} | ${m.clubId} | ${a.parsed.raw} | ${label(a.identity)} | ${others} |`);
  }
  L.push(``);

  const merges = new Map<string, { from: string; to: Identity; n: number }>();
  for (const a of resolved.assignments.values()) {
    if (a.method !== "suffix_merge") continue;
    const k = `${a.parsed.raw}|${a.identity.id}`;
    const cur = merges.get(k);
    if (cur) cur.n++;
    else merges.set(k, { from: a.parsed.raw, to: a.identity, n: 1 });
  }
  L.push(`## Suffix merges (${merges.size})`, ``, `A name written without a suffix, merged into the only suffixed player of that name at the club.`, ``);
  for (const m of merges.values()) L.push(`- "${m.from}" x${m.n} → ${label(m.to)}`);
  L.push(``);

  const unknownFirst = resolved.identities.filter((i) => i.givenCanon === null);
  L.push(`## Players with no first name on any sheet (${unknownFirst.length})`, ``);
  for (const i of unknownFirst.sort((a, b) => a.clubId.localeCompare(b.clubId) || a.surnameKey.localeCompare(b.surnameKey))) {
    const spellings = [...i.surnameSpellings.keys()].join(", ");
    L.push(`- ${i.clubId}: **${displayNameFor(i)}** (${i.id}) ${spanOf(i)}, ${i.tokenCount} rows — written as ${spellings}`);
  }
  L.push(``);

  const cross = new Map<string, Identity[]>();
  for (const i of resolved.identities) {
    if (!i.givenCanon) continue;
    const k = `${i.givenCanon}|${i.surnameKey}|${i.suffix ?? ""}`;
    cross.set(k, [...(cross.get(k) ?? []), i]);
  }
  const crossList = [...cross.values()].filter((g) => new Set(g.map((i) => i.clubId)).size > 1);
  L.push(`## Same name at more than one club (${crossList.length})`, ``, `Possibly the same person who changed clubs. Join them with a \`people:\` entry in players.yaml.`, ``);
  for (const g of crossList) L.push(`- ${g.map(label).join(" / ")}`);
  L.push(``);

  const near: string[] = [];
  const byClub = new Map<string, Identity[]>();
  for (const i of resolved.identities) byClub.set(i.clubId, [...(byClub.get(i.clubId) ?? []), i]);
  for (const list of byClub.values()) {
    for (let a = 0; a < list.length; a++)
      for (let b = a + 1; b < list.length; b++) {
        const x = list[a], y = list[b];
        if (x.surnameKey === y.surnameKey) continue;
        if (editDistance(x.surnameKey, y.surnameKey) <= 1 && (!x.givenCanon || !y.givenCanon || x.givenCanon[0] === y.givenCanon[0])) near.push(`- ${label(x)} ~ ${label(y)}`);
      }
  }
  L.push(`## Near-duplicate surnames within a club (${near.length})`, ``, `One letter apart. Likely a transcription or handwriting variant; add an alias rule if so.`, ``, ...near, ``);

  L.push(`## Roster by club`, ``);
  for (const c of clubsCfg) {
    const list = (byClub.get(c.id) ?? []).sort((a, b) => a.surnameKey.localeCompare(b.surnameKey) || (a.givenCanon ?? "").localeCompare(b.givenCanon ?? ""));
    if (!list.length) continue;
    L.push(`### ${c.name} (${list.length})`, ``, `| Player | id | Seasons | Rows | Written as |`, `|---|---|---|---|---|`);
    for (const i of list) {
      const spell = [...aliasAgg.values()].filter((a) => a.playerId === i.id).sort((a, b) => b.occurrences - a.occurrences).map((a) => `${a.rawName} (${a.occurrences})`).join(", ");
      L.push(`| ${displayNameFor(i)}${i.needsReview ? " ⚠" : ""} | \`${i.id}\` | ${spanOf(i)} | ${i.tokenCount} | ${spell} |`);
    }
    L.push(``);
  }
  void byId;
  fs.writeFileSync(path.join(ROOT, "reports/player-resolution.md"), L.join("\n"));
}

{
  const L: string[] = [];
  L.push(`# Import summary`, ``, `Generated ${now} from \`${path.basename(SOURCE)}\` (sha256 ${sourceSha.slice(0, 12)}).${DRY_RUN ? " **Dry run: database not written.**" : ""}`, ``);
  L.push(`| Table | Rows |`, `|---|---|`);
  for (const [k, v] of Object.entries(out)) L.push(`| ${k} | ${v.length} |`);
  L.push(``, `## Seasons`, ``, `| Year | Era | Status | Clubs | Sessions with rows | Entries | Champion(s) | Flags |`, `|---|---|---|---|---|---|---|---|`);
  for (const s of out.seasons) {
    const sess = out.sessions.filter((x) => x.seasonYear === s.year);
    const withRows = sess.filter((x) => x.hasPlayerRows).length;
    const entries = out.entries.filter((e) => sess.some((x) => x.id === e.sessionId)).length;
    const champs = out.teamSeasonResults.filter((t) => t.seasonYear === s.year && t.isChampion).map((t) => clubById.get(t.clubId)!.shortName).join(", ");
    const flags = out.dataFlags.filter((f) => f.seasonYear === s.year).length;
    L.push(`| ${s.year} | ${s.eraId ?? "-"} | ${s.status} | ${s.clubCount ?? "-"} | ${sess.length ? `${withRows}/${sess.length}` : "-"} | ${entries || "-"} | ${champs || "-"} | ${flags || ""} |`);
  }
  L.push(``, `## Flags from the sheet (${out.dataFlags.length})`, ``, `| Kind | Severity | Count |`, `|---|---|---|`);
  const fk = new Map<string, number>();
  for (const f of out.dataFlags) fk.set(`${f.kind}|${f.severity}`, (fk.get(`${f.kind}|${f.severity}`) ?? 0) + 1);
  for (const [k, v] of [...fk].sort()) L.push(`| ${k.split("|")[0]} | ${k.split("|")[1]} | ${v} |`);
  L.push(``, `### Warnings and errors`, ``);
  for (const f of out.dataFlags.filter((f) => f.severity !== "info")) L.push(`- [${f.severity}] ${f.kind} ${f.seasonYear ?? ""} ${f.sessionId ?? ""} ${f.entryId ?? ""} — ${f.message}`);
  fs.writeFileSync(path.join(ROOT, "reports/import-summary.md"), L.join("\n") + "\n");
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

async function write() {
  await migrate(db, { migrationsFolder: path.join(ROOT, "drizzle") });
  await client.execute("PRAGMA foreign_keys = ON");
  await db.transaction(async (tx) => {
    // delete in dependency order, then insert in reverse
    for (const t of [
      schema.dataFlags, schema.awards, schema.entryOpponentPoints, schema.entryPlayers, schema.entries, schema.playerAliases,
      schema.players, schema.teamSessionResults, schema.teamSeasonResults, schema.sessions, schema.seasons, schema.eras, schema.clubs, schema.documents,
    ]) await tx.delete(t);
    const chunk = async <T extends object>(table: Parameters<typeof tx.insert>[0], rows: T[]) => {
      for (let i = 0; i < rows.length; i += 200) await tx.insert(table).values(rows.slice(i, i + 200) as never);
    };
    await chunk(schema.clubs, out.clubs);
    await chunk(schema.eras, out.eras);
    await chunk(schema.seasons, out.seasons);
    await chunk(schema.sessions, out.sessions);
    await chunk(schema.teamSessionResults, out.teamSessionResults);
    await chunk(schema.teamSeasonResults, out.teamSeasonResults);
    await chunk(schema.players, out.players);
    await chunk(schema.playerAliases, out.playerAliases);
    await chunk(schema.entries, out.entries);
    await chunk(schema.entryPlayers, out.entryPlayers);
    await chunk(schema.entryOpponentPoints, out.entryOpponentPoints);
    await chunk(schema.awards, out.awards);
    await chunk(schema.dataFlags, out.dataFlags);
    await chunk(schema.documents, out.documents);
    await tx.insert(schema.importRuns).values({
      ranAt: now,
      sourceFile: path.basename(SOURCE),
      sourceSha256: sourceSha,
      entryCount: out.entries.length,
      playerCount: out.players.length,
      summary: JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]))),
    });
  });
  const n = await db.get<{ n: number }>(sql`select count(*) as n from entries`);
  return n?.n ?? 0;
}

(async () => {
  const errors = out.dataFlags.filter((f) => f.severity === "error");
  console.log(`Parsed ${playerRows.length} player rows, ${shRows.length} season-history rows → ${out.seasons.length} seasons, ${out.sessions.length} sessions, ${out.entries.length} entries, ${out.players.length} players.`);
  console.log(`Flags: ${out.dataFlags.length} (${errors.length} errors, ${out.dataFlags.filter((f) => f.severity === "warning").length} warnings).`);
  console.log(`Reports: reports/player-resolution.md, reports/import-summary.md`);
  if (DRY_RUN) {
    console.log("Dry run: database untouched.");
    return;
  }
  const n = await write();
  console.log(`Wrote ${process.env.DATABASE_URL ?? "file:data/diebold.db"} (${n} entries).`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
