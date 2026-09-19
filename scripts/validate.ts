/**
 * Validate the imported database and record findings as DataFlags.
 *
 *   npm run validate
 *
 * Checks (severity):
 *   entry_count               each club has 8 singles / 4 pairs lines per session with rows      (error)
 *   entry_player_count        singles lines name one player, pairs lines two                     (error)
 *   points_range              every per-opponent score is 0..ptsPerMatch in half-point steps     (error)
 *   entry_total_mismatch      Total Pts on the sheet ≠ sum of per-opponent columns               (warning)
 *   h2h_imbalance             A's points vs B + B's points vs A ≠ matches x ptsPerMatch           (error)
 *   session_total_mismatch    club's rows ≠ recorded session total                               (error)
 *   session_available_mismatch  all clubs' recorded session points ≠ total available             (error)
 *   season_sum_mismatch       recorded sessions ≠ recorded final                                 (error)
 *   season_available_mismatch  all clubs' finals ≠ total available for the season                (error)
 *   place_order               places disagree with finals order (ties share a place)             (error)
 *   venue_rotation            a club hosts twice in one modern season                            (warning)
 *
 * Exit code 1 when any error is not acknowledged in data/overrides/known-issues.yaml.
 * Keys printed in reports/validation.md are what you acknowledge.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/client";

const ROOT = path.resolve(__dirname, "..");
const known = (YAML.parse(fs.readFileSync(path.join(ROOT, "data/overrides/known-issues.yaml"), "utf8")) ?? {}) as {
  acknowledged?: { key: string; reason: string }[];
};
const acknowledged = new Map((known.acknowledged ?? []).map((k) => [k.key, k.reason]));

type Severity = "info" | "warning" | "error";
interface Finding {
  key: string;
  kind: string;
  severity: Severity;
  seasonYear?: number | null;
  sessionId?: string | null;
  clubId?: string | null;
  entryId?: string | null;
  message: string;
}
const findings: Finding[] = [];
const add = (f: Finding) => findings.push(f);
const eq0 = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".5", "½").replace(/\.0$/, ""));

async function main() {
  const clubs = await db.select().from(schema.clubs);
  const clubName = new Map(clubs.map((c) => [c.id, c.shortName]));
  const seasons = await db.select().from(schema.seasons);
  const sessions = await db.select().from(schema.sessions);
  const tsr = await db.select().from(schema.teamSessionResults);
  const tse = await db.select().from(schema.teamSeasonResults);
  const entries = await db.select().from(schema.entries);
  const eps = await db.select().from(schema.entryPlayers);
  const eop = await db.select().from(schema.entryOpponentPoints);

  const entriesBySession = new Map<string, typeof entries>();
  for (const e of entries) entriesBySession.set(e.sessionId, [...(entriesBySession.get(e.sessionId) ?? []), e]);
  const epByEntry = new Map<string, typeof eps>();
  for (const p of eps) epByEntry.set(p.entryId, [...(epByEntry.get(p.entryId) ?? []), p]);
  const oppByEntry = new Map<string, typeof eop>();
  for (const o of eop) oppByEntry.set(o.entryId, [...(oppByEntry.get(o.entryId) ?? []), o]);
  const tsrBySession = new Map<string, typeof tsr>();
  for (const t of tsr) tsrBySession.set(t.sessionId, [...(tsrBySession.get(t.sessionId) ?? []), t]);

  // ---- per session with player rows
  for (const s of sessions) {
    const rows = entriesBySession.get(s.id) ?? [];
    if (!rows.length) continue;
    const clubsInSeason = (tsrBySession.get(s.id) ?? []).map((t) => t.clubId);
    const byClub = new Map<string, typeof rows>();
    for (const e of rows) byClub.set(e.clubId, [...(byClub.get(e.clubId) ?? []), e]);

    // entry counts, player counts, ranges, totals
    for (const clubId of clubsInSeason) {
      const list = byClub.get(clubId) ?? [];
      if (list.length !== s.matchesPerPairing) {
        add({ key: `entry_count:${s.id}:${clubId}`, kind: "entry_count", severity: "error", seasonYear: s.seasonYear, sessionId: s.id, clubId, message: `${clubName.get(clubId)} has ${list.length} lines in ${s.name} ${s.seasonYear}; expected ${s.matchesPerPairing}.` });
      }
    }
    for (const e of rows) {
      const players = epByEntry.get(e.id) ?? [];
      if (players.length !== s.playersPerEntry) {
        add({ key: `entry_player_count:${e.id}`, kind: "entry_player_count", severity: "error", seasonYear: s.seasonYear, sessionId: s.id, clubId: e.clubId, entryId: e.id, message: `"${e.rawNames}" resolves to ${players.length} player(s); ${s.name} needs ${s.playersPerEntry}.` });
      }
      for (const o of oppByEntry.get(e.id) ?? []) {
        if (o.points < 0 || o.points > s.ptsPerMatch || !eq0(o.points * 2, Math.round(o.points * 2))) {
          add({ key: `points_range:${e.id}:${o.opponentClubId}`, kind: "points_range", severity: "error", seasonYear: s.seasonYear, sessionId: s.id, clubId: e.clubId, entryId: e.id, message: `"${e.rawNames}" vs ${clubName.get(o.opponentClubId)}: ${o.points} is outside 0..${s.ptsPerMatch}.` });
        }
      }
      if (e.totalRecorded !== null && !eq0(e.totalRecorded, e.totalPoints)) {
        add({ key: `entry_total_mismatch:${e.id}`, kind: "entry_total_mismatch", severity: "warning", seasonYear: s.seasonYear, sessionId: s.id, clubId: e.clubId, entryId: e.id, message: `"${e.rawNames}": sheet total ${fmt(e.totalRecorded)}, columns sum to ${fmt(e.totalPoints)}.${e.sheetNote ? ` Sheet note: ${e.sheetNote}` : ""}` });
      }
    }

    // head-to-head balance
    const expected = s.matchesPerPairing * s.ptsPerMatch;
    for (let i = 0; i < clubsInSeason.length; i++) {
      for (let j = i + 1; j < clubsInSeason.length; j++) {
        const a = clubsInSeason[i], b = clubsInSeason[j];
        if (!byClub.has(a) || !byClub.has(b)) continue;
        const aVsB = (byClub.get(a) ?? []).flatMap((e) => oppByEntry.get(e.id) ?? []).filter((o) => o.opponentClubId === b).reduce((x, o) => x + o.points, 0);
        const bVsA = (byClub.get(b) ?? []).flatMap((e) => oppByEntry.get(e.id) ?? []).filter((o) => o.opponentClubId === a).reduce((x, o) => x + o.points, 0);
        if (!eq0(aVsB + bVsA, expected)) {
          add({
            key: `h2h_imbalance:${s.id}:${a}:${b}`,
            kind: "h2h_imbalance",
            severity: "error",
            seasonYear: s.seasonYear,
            sessionId: s.id,
            message: `${s.name} ${s.seasonYear}: ${clubName.get(a)} ${fmt(aVsB)} vs ${clubName.get(b)} ${fmt(bVsA)} = ${fmt(aVsB + bVsA)}, expected ${expected} (${s.matchesPerPairing} x ${s.ptsPerMatch}).`,
          });
        }
      }
    }

    // club session total vs recorded
    for (const t of tsrBySession.get(s.id) ?? []) {
      const list = byClub.get(t.clubId);
      if (!list || t.points === null) continue;
      const sum = list.reduce((x, e) => x + e.totalPoints, 0);
      if (!eq0(sum, t.points)) {
        add({ key: `session_total_mismatch:${s.id}:${t.clubId}`, kind: "session_total_mismatch", severity: "error", seasonYear: s.seasonYear, sessionId: s.id, clubId: t.clubId, message: `${clubName.get(t.clubId)} rows sum to ${fmt(sum)} in ${s.name} ${s.seasonYear}; recorded session total is ${fmt(t.points)}.` });
      }
    }
  }

  // ---- session totals across clubs vs available (all sessions with recorded totals)
  for (const s of sessions) {
    const list = tsrBySession.get(s.id) ?? [];
    if (!list.length || list.some((t) => t.points === null)) continue;
    const n = list.length;
    const totalAvailable = ((n * (n - 1)) / 2) * s.matchesPerPairing * s.ptsPerMatch;
    const sum = list.reduce((x, t) => x + (t.points ?? 0), 0);
    if (!eq0(sum, totalAvailable)) {
      add({ key: `session_available_mismatch:${s.id}`, kind: "session_available_mismatch", severity: "error", seasonYear: s.seasonYear, sessionId: s.id, message: `${s.name} ${s.seasonYear}: clubs' recorded points sum to ${fmt(sum)}; ${fmt(totalAvailable)} were available.` });
    }
  }

  // ---- season sums, finals vs available, place order, venue rotation
  for (const season of seasons) {
    const rows = tse.filter((t) => t.seasonYear === season.year);
    if (!rows.length) continue;
    for (const t of rows) {
      if (t.sumOfSessions !== null && t.finalPoints !== null && !eq0(t.sumOfSessions, t.finalPoints)) {
        add({ key: `season_sum_mismatch:${season.year}:${t.clubId}`, kind: "season_sum_mismatch", severity: "error", seasonYear: season.year, clubId: t.clubId, message: `${clubName.get(t.clubId)} ${season.year}: sessions sum to ${fmt(t.sumOfSessions)}, recorded final is ${fmt(t.finalPoints)}.` });
      }
    }
    const seasonSessions = sessions.filter((s) => s.seasonYear === season.year);
    const allSessionsRecorded = seasonSessions.length > 0 && seasonSessions.every((s) => (tsrBySession.get(s.id) ?? []).every((t) => t.points !== null));
    const allFinals = rows.every((t) => t.finalPoints !== null);
    // Finals must equal the points available for the season. Skipped when the
    // final does not cover the whole season: early-era years with unrecorded
    // matches (1946) and seasons without final standings (2022).
    const finalCoversSeason = season.eraId === "early" ? allSessionsRecorded : season.standingsFinal;
    if (allFinals && finalCoversSeason) {
      const n = rows.length;
      const available = seasonSessions.reduce((x, s) => x + ((n * (n - 1)) / 2) * s.matchesPerPairing * s.ptsPerMatch, 0);
      const sum = rows.reduce((x, t) => x + (t.finalPoints ?? 0), 0);
      if (!eq0(sum, available)) {
        add({ key: `season_available_mismatch:${season.year}`, kind: "season_available_mismatch", severity: "error", seasonYear: season.year, message: `${season.year}: finals sum to ${fmt(sum)}; ${fmt(available)} points were available.` });
      }
    }
    if (season.standingsFinal) {
      const sorted = [...rows].filter((t) => t.finalPoints !== null).sort((a, b) => (b.finalPoints ?? 0) - (a.finalPoints ?? 0));
      let expectedPlace = 1;
      sorted.forEach((t, i) => {
        if (i > 0 && !eq0(t.finalPoints ?? 0, sorted[i - 1].finalPoints ?? 0)) expectedPlace = i + 1;
        if (t.place !== expectedPlace) {
          add({ key: `place_order:${season.year}:${t.clubId}`, kind: "place_order", severity: "error", seasonYear: season.year, clubId: t.clubId, message: `${clubName.get(t.clubId)} ${season.year}: recorded place ${t.place}, finals order says ${expectedPlace}.` });
        }
      });
    }
    if (season.eraId !== "early") {
      const hosts = seasonSessions.map((s) => s.venueClubId).filter((v): v is string => !!v);
      const dup = [...new Set(hosts.filter((h, i) => hosts.indexOf(h) !== i))];
      if (dup.length) add({ key: `venue_rotation:${season.year}`, kind: "venue_rotation", severity: "warning", seasonYear: season.year, message: `${season.year}: ${dup.map((d) => clubName.get(d)).join(", ")} listed as host more than once.` });
    }
  }

  // ---- write flags
  await db.delete(schema.dataFlags).where(eq(schema.dataFlags.source, "validator"));
  const rows = findings.map((f, i) => ({
    id: `validator-${i + 1}`,
    kind: f.kind,
    severity: f.severity,
    source: "validator",
    seasonYear: f.seasonYear ?? null,
    sessionId: f.sessionId ?? null,
    clubId: f.clubId ?? null,
    entryId: f.entryId ?? null,
    playerId: null,
    message: acknowledged.has(f.key) ? `${f.message} Acknowledged: ${acknowledged.get(f.key)}` : f.message,
    acknowledged: acknowledged.has(f.key),
  }));
  for (let i = 0; i < rows.length; i += 200) await db.insert(schema.dataFlags).values(rows.slice(i, i + 200));

  // ---- report
  const errors = findings.filter((f) => f.severity === "error");
  const unack = errors.filter((f) => !acknowledged.has(f.key));
  const stale = [...acknowledged.keys()].filter((k) => !findings.some((f) => f.key === k));
  const L: string[] = [];
  L.push(`# Validation report`, ``, `Generated ${new Date().toISOString()}.`, ``);
  L.push(`| | |`, `|---|---|`, `| sessions with player rows | ${sessions.filter((s) => s.hasPlayerRows).length} |`, `| entries checked | ${entries.length} |`, `| findings | ${findings.length} |`, `| errors | ${errors.length} |`, `| errors not acknowledged | ${unack.length} |`, `| warnings | ${findings.filter((f) => f.severity === "warning").length} |`, ``);
  const section = (title: string, list: Finding[]) => {
    L.push(`## ${title} (${list.length})`, ``);
    if (!list.length) L.push(`None.`, ``);
    else {
      L.push(`| Key | Message |`, `|---|---|`);
      for (const f of list) L.push(`| \`${f.key}\` | ${f.message} |`);
      L.push(``);
    }
  };
  section("Errors not acknowledged — CI fails on these", unack);
  section("Acknowledged errors (data/overrides/known-issues.yaml)", errors.filter((f) => acknowledged.has(f.key)));
  section("Warnings", findings.filter((f) => f.severity === "warning"));
  if (stale.length) L.push(`## Stale acknowledgements`, ``, `Listed in known-issues.yaml but no longer found; remove them.`, ``, ...stale.map((k) => `- \`${k}\``), ``);
  fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "reports/validation.md"), L.join("\n") + "\n");

  console.log(`Validated ${entries.length} entries across ${sessions.filter((s) => s.hasPlayerRows).length} sessions with player rows.`);
  console.log(`${findings.length} findings: ${errors.length} errors (${unack.length} unacknowledged), ${findings.filter((f) => f.severity === "warning").length} warnings. Report: reports/validation.md`);
  for (const f of unack) console.log(`  ✗ ${f.key}: ${f.message}`);
  if (stale.length) console.log(`  stale acknowledgements: ${stale.join(", ")}`);
  if (unack.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
