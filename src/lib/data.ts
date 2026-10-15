/**
 * Read model for the site and the /api/ask tools.
 *
 * The database is small (≈12k rows) and rebuilt only at deploy time, so it is
 * loaded once per server instance and every page query is a plain in-memory
 * computation. Everything the UI or the chat tools show comes from here, so
 * a number on the site and a number in a chat answer are always the same
 * number.
 */
import { db, schema } from "@/db/client";

export type Club = typeof schema.clubs.$inferSelect;
export type Season = typeof schema.seasons.$inferSelect;
export type Session = typeof schema.sessions.$inferSelect;
export type TeamSessionResult = typeof schema.teamSessionResults.$inferSelect;
export type TeamSeasonResult = typeof schema.teamSeasonResults.$inferSelect;
export type Player = typeof schema.players.$inferSelect;
export type PlayerAlias = typeof schema.playerAliases.$inferSelect;
export type Entry = typeof schema.entries.$inferSelect;
export type EntryPlayer = typeof schema.entryPlayers.$inferSelect;
export type EntryOpponentPoints = typeof schema.entryOpponentPoints.$inferSelect;
export type Award = typeof schema.awards.$inferSelect;
export type DataFlag = typeof schema.dataFlags.$inferSelect;
export type Doc = typeof schema.documents.$inferSelect;
export type Era = typeof schema.eras.$inferSelect;

export interface Store {
  clubs: Club[];
  clubById: Map<string, Club>;
  eras: Era[];
  seasons: Season[];
  seasonByYear: Map<number, Season>;
  sessions: Session[];
  sessionById: Map<string, Session>;
  sessionsByYear: Map<number, Session[]>;
  teamSession: TeamSessionResult[];
  teamSessionBySession: Map<string, TeamSessionResult[]>;
  teamSeason: TeamSeasonResult[];
  teamSeasonByYear: Map<number, TeamSeasonResult[]>;
  players: Player[];
  playerById: Map<string, Player>;
  aliases: PlayerAlias[];
  aliasesByPlayer: Map<string, PlayerAlias[]>;
  entries: Entry[];
  entryById: Map<string, Entry>;
  entriesBySession: Map<string, Entry[]>;
  entryPlayers: EntryPlayer[];
  entryPlayersByEntry: Map<string, EntryPlayer[]>;
  entryPlayersByPlayer: Map<string, EntryPlayer[]>;
  opp: EntryOpponentPoints[];
  oppByEntry: Map<string, EntryOpponentPoints[]>;
  awards: Award[];
  awardsByYear: Map<number, Award[]>;
  flags: DataFlag[];
  flagsByYear: Map<number, DataFlag[]>;
  flagsByEntry: Map<string, DataFlag[]>;
  flagsByPlayer: Map<string, DataFlag[]>;
  documents: Doc[];
}

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

let storePromise: Promise<Store> | null = null;

export function getStore(): Promise<Store> {
  if (!storePromise) storePromise = load();
  return storePromise;
}

async function load(): Promise<Store> {
  const [clubs, eras, seasons, sessions, teamSession, teamSeason, players, aliases, entries, entryPlayers, opp, awards, flags, documents] = await Promise.all([
    db.select().from(schema.clubs),
    db.select().from(schema.eras),
    db.select().from(schema.seasons),
    db.select().from(schema.sessions),
    db.select().from(schema.teamSessionResults),
    db.select().from(schema.teamSeasonResults),
    db.select().from(schema.players),
    db.select().from(schema.playerAliases),
    db.select().from(schema.entries),
    db.select().from(schema.entryPlayers),
    db.select().from(schema.entryOpponentPoints),
    db.select().from(schema.awards),
    db.select().from(schema.dataFlags),
    db.select().from(schema.documents),
  ]);
  clubs.sort((a, b) => a.sortOrder - b.sortOrder);
  seasons.sort((a, b) => a.year - b.year);
  sessions.sort((a, b) => a.seasonYear - b.seasonYear || a.ordinal - b.ordinal);
  entries.sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.lineNo - b.lineNo);
  players.sort((a, b) => a.sortName.localeCompare(b.sortName));
  documents.sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    clubs,
    clubById: new Map(clubs.map((c) => [c.id, c])),
    eras,
    seasons,
    seasonByYear: new Map(seasons.map((s) => [s.year, s])),
    sessions,
    sessionById: new Map(sessions.map((s) => [s.id, s])),
    sessionsByYear: groupBy(sessions, (s) => s.seasonYear),
    teamSession,
    teamSessionBySession: groupBy(teamSession, (t) => t.sessionId),
    teamSeason,
    teamSeasonByYear: groupBy(teamSeason, (t) => t.seasonYear),
    players,
    playerById: new Map(players.map((p) => [p.id, p])),
    aliases,
    aliasesByPlayer: groupBy(aliases, (a) => a.playerId),
    entries,
    entryById: new Map(entries.map((e) => [e.id, e])),
    entriesBySession: groupBy(entries, (e) => e.sessionId),
    entryPlayers,
    entryPlayersByEntry: groupBy(entryPlayers, (e) => e.entryId),
    entryPlayersByPlayer: groupBy(entryPlayers, (e) => e.playerId),
    opp,
    oppByEntry: groupBy(opp, (o) => o.entryId),
    awards,
    awardsByYear: groupBy(awards, (a) => a.seasonYear),
    flags,
    flagsByYear: groupBy(flags.filter((f) => f.seasonYear !== null), (f) => f.seasonYear as number),
    flagsByEntry: groupBy(flags.filter((f) => f.entryId !== null), (f) => f.entryId as string),
    flagsByPlayer: groupBy(flags.filter((f) => f.playerId !== null), (f) => f.playerId as string),
    documents,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers (shared by pages and chat tools)
// ---------------------------------------------------------------------------

/** 4.5 -> "4½", 4 -> "4", 0.5 -> "½". */
export function fmtPts(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  const whole = Math.trunc(n);
  const frac = Math.abs(n - whole);
  if (frac < 1e-9) return String(whole);
  if (Math.abs(frac - 0.5) < 1e-9) return whole === 0 ? (n < 0 ? "-½" : "½") : `${whole}½`;
  return n.toFixed(1);
}

export function fmtPct(points: number, available: number): string {
  if (!available) return "–";
  return `${((100 * points) / available).toFixed(1)}%`;
}

export function pct(points: number, available: number): number {
  return available ? points / available : 0;
}

export const ERA_LABEL: Record<string, string> = { early: "1945–1954", middle: "1995–2006", modern: "2007–present" };

// ---------------------------------------------------------------------------
// Clubs and standings
// ---------------------------------------------------------------------------

export interface ClubStanding {
  club: Club;
  titles: number;
  titleYears: number[];
  seasons: number;
  firsts: number;
  seconds: number;
  thirds: number;
  fourths: number;
  /** Modern-era (player rows) points / available. */
  points: number;
  available: number;
  firstSeason: number | null;
  lastSeason: number | null;
}

export function allTimeStandings(s: Store): ClubStanding[] {
  const out: ClubStanding[] = s.clubs.map((club) => ({ club, titles: 0, titleYears: [], seasons: 0, firsts: 0, seconds: 0, thirds: 0, fourths: 0, points: 0, available: 0, firstSeason: null, lastSeason: null }));
  const byClub = new Map(out.map((o) => [o.club.id, o]));
  for (const t of s.teamSeason) {
    const o = byClub.get(t.clubId)!;
    o.seasons++;
    o.firstSeason = o.firstSeason === null ? t.seasonYear : Math.min(o.firstSeason, t.seasonYear);
    o.lastSeason = o.lastSeason === null ? t.seasonYear : Math.max(o.lastSeason, t.seasonYear);
    if (t.isChampion) {
      o.titles++;
      o.titleYears.push(t.seasonYear);
    }
    if (t.place === 1) o.firsts++;
    else if (t.place === 2) o.seconds++;
    else if (t.place === 3) o.thirds++;
    else if (t.place === 4) o.fourths++;
  }
  for (const t of s.teamSession) {
    if (t.points === null || t.available === null) continue;
    const o = byClub.get(t.clubId)!;
    o.points += t.points;
    o.available += t.available;
  }
  for (const o of out) o.titleYears.sort((a, b) => a - b);
  return out.filter((o) => o.seasons > 0).sort((a, b) => b.titles - a.titles || pct(b.points, b.available) - pct(a.points, a.available));
}

export function latestFinalSeason(s: Store): Season | undefined {
  return [...s.seasons].reverse().find((x) => x.standingsFinal && (s.teamSeasonByYear.get(x.year)?.length ?? 0) > 0);
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

export interface SessionView {
  session: Session;
  venue: Club | null;
  teams: (TeamSessionResult & { club: Club })[];
  entries: EntryView[];
}

export interface EntryView {
  entry: Entry;
  club: Club;
  players: (EntryPlayer & { player: Player })[];
  vs: { club: Club; points: number; available: number }[];
  flags: DataFlag[];
}

export interface SeasonView {
  season: Season;
  era: Era | null;
  standings: (TeamSeasonResult & { club: Club })[];
  sessions: SessionView[];
  awards: (Award & { club: Club | null })[];
  flags: DataFlag[];
  prev: Season | null;
  next: Season | null;
}

export function entryView(s: Store, e: Entry): EntryView {
  const session = s.sessionById.get(e.sessionId)!;
  const clubsInSeason = (s.teamSessionBySession.get(session.id) ?? []).map((t) => t.clubId);
  const oppRows = s.oppByEntry.get(e.id) ?? [];
  return {
    entry: e,
    club: s.clubById.get(e.clubId)!,
    players: (s.entryPlayersByEntry.get(e.id) ?? []).sort((a, b) => a.position - b.position).map((ep) => ({ ...ep, player: s.playerById.get(ep.playerId)! })),
    vs: clubsInSeason
      .filter((c) => c !== e.clubId)
      .map((c) => {
        const o = oppRows.find((x) => x.opponentClubId === c);
        return { club: s.clubById.get(c)!, points: o?.points ?? 0, available: o?.available ?? session.ptsPerMatch };
      }),
    flags: s.flagsByEntry.get(e.id) ?? [],
  };
}

export function sessionView(s: Store, session: Session): SessionView {
  return {
    session,
    venue: session.venueClubId ? s.clubById.get(session.venueClubId) ?? null : null,
    teams: (s.teamSessionBySession.get(session.id) ?? []).map((t) => ({ ...t, club: s.clubById.get(t.clubId)! })).sort((a, b) => (b.points ?? -1) - (a.points ?? -1)),
    entries: (s.entriesBySession.get(session.id) ?? []).map((e) => entryView(s, e)),
  };
}

export function seasonView(s: Store, year: number): SeasonView | null {
  const season = s.seasonByYear.get(year);
  if (!season) return null;
  const idx = s.seasons.indexOf(season);
  const standings = (s.teamSeasonByYear.get(year) ?? [])
    .map((t) => ({ ...t, club: s.clubById.get(t.clubId)! }))
    .sort((a, b) => (a.place ?? 9) - (b.place ?? 9) || (b.finalPoints ?? 0) - (a.finalPoints ?? 0));
  return {
    season,
    era: season.eraId ? s.eras.find((e) => e.id === season.eraId) ?? null : null,
    standings,
    sessions: (s.sessionsByYear.get(year) ?? []).map((x) => sessionView(s, x)),
    awards: (s.awardsByYear.get(year) ?? []).map((a) => ({ ...a, club: a.clubId ? s.clubById.get(a.clubId) ?? null : null })),
    flags: (s.flagsByYear.get(year) ?? []).filter((f) => !f.entryId),
    prev: idx > 0 ? s.seasons[idx - 1] : null,
    next: idx < s.seasons.length - 1 ? s.seasons[idx + 1] : null,
  };
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export interface PlayerMatch {
  entry: Entry;
  session: Session;
  season: Season;
  venue: Club | null;
  partner: Player | null;
  vs: { club: Club; points: number; available: number }[];
  flags: DataFlag[];
}

export interface PlayerSeasonLine {
  year: number;
  matches: number;
  points: number;
  available: number;
  singlesPoints: number;
  singlesAvailable: number;
  singlesMatches: number;
  pairsPoints: number;
  pairsAvailable: number;
  bestGross: number | null;
  placeOfClub: number | null;
  clubChampion: boolean;
}

export interface Partnership {
  partner: Player;
  times: number;
  points: number;
  available: number;
  years: number[];
  bestGross: number | null;
}

export interface PlayerView {
  player: Player;
  club: Club;
  aliases: PlayerAlias[];
  samePerson: (Player & { club: Club })[];
  matches: PlayerMatch[];
  seasons: PlayerSeasonLine[];
  totals: { matches: number; seasons: number; points: number; available: number; singlesPoints: number; singlesAvailable: number; singlesMatches: number; pairsPoints: number; pairsAvailable: number; pairsMatches: number };
  vsClubs: { club: Club; points: number; available: number; matches: number }[];
  bestGross: { gross: number; match: PlayerMatch }[];
  partnerships: Partnership[];
  awards: (Award & { season: Season })[];
  flags: DataFlag[];
}

export function playerMatches(s: Store, playerId: string): PlayerMatch[] {
  const eps = s.entryPlayersByPlayer.get(playerId) ?? [];
  return eps
    .map((ep) => {
      const entry = s.entryById.get(ep.entryId)!;
      const session = s.sessionById.get(entry.sessionId)!;
      const others = (s.entryPlayersByEntry.get(entry.id) ?? []).filter((x) => x.playerId !== playerId);
      const view = entryView(s, entry);
      return {
        entry,
        session,
        season: s.seasonByYear.get(session.seasonYear)!,
        venue: session.venueClubId ? s.clubById.get(session.venueClubId) ?? null : null,
        partner: others.length ? s.playerById.get(others[0].playerId) ?? null : null,
        vs: view.vs,
        flags: view.flags,
      };
    })
    .sort((a, b) => a.session.seasonYear - b.session.seasonYear || a.session.ordinal - b.session.ordinal);
}

export function playerView(s: Store, id: string): PlayerView | null {
  const player = s.playerById.get(id);
  if (!player) return null;
  const club = s.clubById.get(player.clubId)!;
  const matches = playerMatches(s, id);
  const bySeason = new Map<number, PlayerSeasonLine>();
  const vs = new Map<string, { club: Club; points: number; available: number; matches: number }>();
  const partners = new Map<string, Partnership>();
  const totals = { matches: 0, seasons: 0, points: 0, available: 0, singlesPoints: 0, singlesAvailable: 0, singlesMatches: 0, pairsPoints: 0, pairsAvailable: 0, pairsMatches: 0 };
  for (const m of matches) {
    const y = m.session.seasonYear;
    const line = bySeason.get(y) ?? (() => {
      const ts = (s.teamSeasonByYear.get(y) ?? []).find((t) => t.clubId === player.clubId);
      const l: PlayerSeasonLine = { year: y, matches: 0, points: 0, available: 0, singlesPoints: 0, singlesAvailable: 0, singlesMatches: 0, pairsPoints: 0, pairsAvailable: 0, bestGross: null, placeOfClub: ts?.place ?? null, clubChampion: ts?.isChampion ?? false };
      bySeason.set(y, l);
      return l;
    })();
    const e = m.entry;
    const singles = m.session.format === "singles";
    line.matches++;
    line.points += e.totalPoints;
    line.available += e.available;
    totals.matches++;
    totals.points += e.totalPoints;
    totals.available += e.available;
    if (singles) {
      line.singlesPoints += e.totalPoints;
      line.singlesAvailable += e.available;
      line.singlesMatches++;
      totals.singlesPoints += e.totalPoints;
      totals.singlesAvailable += e.available;
      totals.singlesMatches++;
    } else {
      line.pairsPoints += e.totalPoints;
      line.pairsAvailable += e.available;
      totals.pairsPoints += e.totalPoints;
      totals.pairsAvailable += e.available;
      totals.pairsMatches++;
    }
    if (e.gross !== null && (line.bestGross === null || e.gross < line.bestGross)) line.bestGross = e.gross;
    for (const v of m.vs) {
      const cur = vs.get(v.club.id) ?? { club: v.club, points: 0, available: 0, matches: 0 };
      cur.points += v.points;
      cur.available += v.available;
      cur.matches++;
      vs.set(v.club.id, cur);
    }
    if (m.partner) {
      const p = partners.get(m.partner.id) ?? { partner: m.partner, times: 0, points: 0, available: 0, years: [], bestGross: null };
      p.times++;
      p.points += e.totalPoints;
      p.available += e.available;
      if (!p.years.includes(y)) p.years.push(y);
      if (e.gross !== null && (p.bestGross === null || e.gross < p.bestGross)) p.bestGross = e.gross;
      partners.set(m.partner.id, p);
    }
  }
  totals.seasons = bySeason.size;
  const samePerson = player.personId ? s.players.filter((p) => p.personId === player.personId && p.id !== player.id).map((p) => ({ ...p, club: s.clubById.get(p.clubId)! })) : [];
  return {
    player,
    club,
    aliases: (s.aliasesByPlayer.get(id) ?? []).sort((a, b) => b.occurrences - a.occurrences),
    samePerson,
    matches,
    seasons: [...bySeason.values()].sort((a, b) => a.year - b.year),
    totals,
    vsClubs: [...vs.values()].sort((a, b) => a.club.sortOrder - b.club.sortOrder),
    bestGross: matches.filter((m) => m.entry.gross !== null).sort((a, b) => a.entry.gross! - b.entry.gross!).slice(0, 5).map((m) => ({ gross: m.entry.gross!, match: m })),
    partnerships: [...partners.values()].sort((a, b) => b.times - a.times || pct(b.points, b.available) - pct(a.points, a.available)),
    awards: s.awards.filter((a) => a.playerId === id || (a.entryId && matches.some((m) => m.entry.id === a.entryId))).map((a) => ({ ...a, season: s.seasonByYear.get(a.seasonYear)! })),
    flags: s.flagsByPlayer.get(id) ?? [],
  };
}

export function playerLabel(p: Player): string {
  return p.displayName;
}

// ---------------------------------------------------------------------------
// Club view
// ---------------------------------------------------------------------------

export interface ClubView {
  club: Club;
  standing: ClubStanding;
  seasons: (TeamSeasonResult & { season: Season; sumOfSessions: number | null })[];
  rosterByEra: { era: Era; players: (Player & { seasons: number; matches: number; points: number; available: number })[] }[];
  vsClubs: { club: Club; points: number; available: number }[];
}

export function clubView(s: Store, id: string): ClubView | null {
  const club = s.clubById.get(id);
  if (!club) return null;
  const standing = allTimeStandings(s).find((x) => x.club.id === id) ?? { club, titles: 0, titleYears: [], seasons: 0, firsts: 0, seconds: 0, thirds: 0, fourths: 0, points: 0, available: 0, firstSeason: null, lastSeason: null };
  const seasons = s.teamSeason.filter((t) => t.clubId === id).map((t) => ({ ...t, season: s.seasonByYear.get(t.seasonYear)! })).sort((a, b) => b.seasonYear - a.seasonYear);
  // roster by era
  const perPlayer = new Map<string, { seasons: Set<number>; matches: number; points: number; available: number }>();
  for (const e of s.entries) {
    if (e.clubId !== id) continue;
    const y = s.sessionById.get(e.sessionId)!.seasonYear;
    for (const ep of s.entryPlayersByEntry.get(e.id) ?? []) {
      const cur = perPlayer.get(ep.playerId) ?? { seasons: new Set<number>(), matches: 0, points: 0, available: 0 };
      cur.seasons.add(y);
      cur.matches++;
      cur.points += e.totalPoints;
      cur.available += e.available;
      perPlayer.set(ep.playerId, cur);
    }
  }
  const rosterByEra = s.eras
    .map((era) => ({
      era,
      players: s.players
        .filter((p) => p.clubId === id && p.firstSeason !== null && [...(perPlayer.get(p.id)?.seasons ?? [])].some((y) => y >= era.fromYear && (era.toYear === null || y <= era.toYear)))
        .map((p) => {
          const st = perPlayer.get(p.id)!;
          return { ...p, seasons: st.seasons.size, matches: st.matches, points: st.points, available: st.available };
        })
        .sort((a, b) => b.seasons - a.seasons || b.matches - a.matches || a.sortName.localeCompare(b.sortName)),
    }))
    .filter((r) => r.players.length > 0);
  // record vs each club (from entries)
  const vs = new Map<string, { club: Club; points: number; available: number }>();
  for (const e of s.entries) {
    if (e.clubId !== id) continue;
    for (const o of s.oppByEntry.get(e.id) ?? []) {
      const cur = vs.get(o.opponentClubId) ?? { club: s.clubById.get(o.opponentClubId)!, points: 0, available: 0 };
      cur.points += o.points;
      cur.available += o.available;
      vs.set(o.opponentClubId, cur);
    }
  }
  return { club, standing, seasons, rosterByEra, vsClubs: [...vs.values()].sort((a, b) => a.club.sortOrder - b.club.sortOrder) };
}

// ---------------------------------------------------------------------------
// Leaderboards
// ---------------------------------------------------------------------------

export interface LeaderboardFilter {
  club?: string | null;
  era?: string | null; // early | middle | modern
  minMatches?: number;
}

export interface CareerRow {
  player: Player;
  club: Club;
  seasons: number;
  matches: number;
  points: number;
  available: number;
  singlesPoints: number;
  singlesAvailable: number;
  singlesMatches: number;
  bestGross: number | null;
}

function inEra(s: Store, year: number, era?: string | null): boolean {
  if (!era) return true;
  const e = s.eras.find((x) => x.id === era);
  if (!e) return true;
  return year >= e.fromYear && (e.toYear === null || year <= e.toYear);
}

export function careerRows(s: Store, f: LeaderboardFilter = {}): CareerRow[] {
  const rows = new Map<string, CareerRow & { years: Set<number> }>();
  for (const e of s.entries) {
    const session = s.sessionById.get(e.sessionId)!;
    if (f.club && e.clubId !== f.club) continue;
    if (!inEra(s, session.seasonYear, f.era)) continue;
    for (const ep of s.entryPlayersByEntry.get(e.id) ?? []) {
      const p = s.playerById.get(ep.playerId)!;
      const r = rows.get(p.id) ?? { player: p, club: s.clubById.get(p.clubId)!, seasons: 0, matches: 0, points: 0, available: 0, singlesPoints: 0, singlesAvailable: 0, singlesMatches: 0, bestGross: null, years: new Set<number>() };
      r.matches++;
      r.points += e.totalPoints;
      r.available += e.available;
      r.years.add(session.seasonYear);
      if (session.format === "singles") {
        r.singlesMatches++;
        r.singlesPoints += e.totalPoints;
        r.singlesAvailable += e.available;
      }
      if (e.gross !== null && (r.bestGross === null || e.gross < r.bestGross)) r.bestGross = e.gross;
      rows.set(p.id, r);
    }
  }
  return [...rows.values()].map((r) => ({ ...r, seasons: r.years.size }));
}

export interface LowRound {
  entry: Entry;
  session: Session;
  club: Club;
  players: Player[];
}

export function lowRounds(s: Store, f: LeaderboardFilter = {}, limit = 25): LowRound[] {
  return s.entries
    .filter((e) => e.gross !== null && (!f.club || e.clubId === f.club) && inEra(s, s.sessionById.get(e.sessionId)!.seasonYear, f.era))
    .sort((a, b) => a.gross! - b.gross! || b.sessionId.localeCompare(a.sessionId))
    .slice(0, limit)
    .map((e) => ({ entry: e, session: s.sessionById.get(e.sessionId)!, club: s.clubById.get(e.clubId)!, players: (s.entryPlayersByEntry.get(e.id) ?? []).sort((a, b) => a.position - b.position).map((ep) => s.playerById.get(ep.playerId)!) }));
}

export interface PairRow {
  players: [Player, Player];
  club: Club;
  times: number;
  points: number;
  available: number;
  years: number[];
  bestGross: number | null;
}

export function partnershipRows(s: Store, f: LeaderboardFilter = {}): PairRow[] {
  const rows = new Map<string, PairRow>();
  for (const e of s.entries) {
    const session = s.sessionById.get(e.sessionId)!;
    if (session.playersPerEntry !== 2) continue;
    if (f.club && e.clubId !== f.club) continue;
    if (!inEra(s, session.seasonYear, f.era)) continue;
    const ps = (s.entryPlayersByEntry.get(e.id) ?? []).map((ep) => s.playerById.get(ep.playerId)!);
    if (ps.length !== 2) continue;
    const key = [ps[0].id, ps[1].id].sort().join("|");
    const r = rows.get(key) ?? { players: [ps[0], ps[1]].sort((a, b) => a.sortName.localeCompare(b.sortName)) as [Player, Player], club: s.clubById.get(e.clubId)!, times: 0, points: 0, available: 0, years: [], bestGross: null };
    r.times++;
    r.points += e.totalPoints;
    r.available += e.available;
    if (!r.years.includes(session.seasonYear)) r.years.push(session.seasonYear);
    if (e.gross !== null && (r.bestGross === null || e.gross < r.bestGross)) r.bestGross = e.gross;
    rows.set(key, r);
  }
  return [...rows.values()].map((r) => ({ ...r, years: r.years.sort((a, b) => a - b) }));
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchResult {
  players: (Player & { club: Club; matchedAlias: string | null })[];
  seasons: Season[];
  clubs: Club[];
}

function norm(x: string): string {
  return x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function search(s: Store, q: string, limit = 30): SearchResult {
  const nq = norm(q);
  if (!nq) return { players: [], seasons: [], clubs: [] };
  const terms = nq.split(" ");
  const players: SearchResult["players"] = [];
  for (const p of s.players) {
    const hay = [p.displayName, p.surname, p.givenName ?? "", ...(s.aliasesByPlayer.get(p.id) ?? []).map((a) => a.rawName)].map(norm);
    const hit = terms.every((t) => hay.some((h) => h.includes(t)));
    if (hit) {
      const matchedAlias = (s.aliasesByPlayer.get(p.id) ?? []).find((a) => norm(a.rawName) !== norm(p.displayName) && terms.every((t) => norm(a.rawName).includes(t)))?.rawName ?? null;
      players.push({ ...p, club: s.clubById.get(p.clubId)!, matchedAlias });
    }
  }
  players.sort((a, b) => (norm(a.displayName).startsWith(nq) ? 0 : 1) - (norm(b.displayName).startsWith(nq) ? 0 : 1) || (b.lastSeason ?? 0) - (a.lastSeason ?? 0));
  const year = /^(19|20)\d\d$/.test(nq) ? Number(nq) : null;
  const seasons = year ? s.seasons.filter((x) => x.year === year) : [];
  const clubs = s.clubs.filter((c) => norm(c.name).includes(nq) || norm(c.shortName).includes(nq) || norm(c.abbreviation) === nq);
  return { players: players.slice(0, limit), seasons, clubs };
}

// ---------------------------------------------------------------------------
// Roster ages
// ---------------------------------------------------------------------------
//
// Age is season year minus birth year: the age a player turned (or had
// turned) in the calendar year of the Cup, which is how the clubs' own age
// rosters count. Birth years come from data/overrides/birthdates.yaml and
// cover fewer than half the players, so every figure here carries the count
// of players it was computed from and the count it was not.

export interface PlayerSeasonAge {
  player: Player;
  club: Club;
  year: number;
  age: number;
  /** Birth year was inferred (from an age or a school class), so the age is "c.". */
  approx: boolean;
}

export interface RosterAgeRow {
  year: number;
  club: Club;
  /** Distinct players on the club's sheets that season. */
  players: number;
  /** Of those, how many have a birth year. */
  withYear: number;
  /** Of those with a birth year, how many are approximate. */
  approx: number;
  avgAge: number | null;
  under25: number;
  under30: number;
  youngest: PlayerSeasonAge | null;
  oldest: PlayerSeasonAge | null;
  /** Every known age that season, youngest first. */
  ages: PlayerSeasonAge[];
}

/** One line per (season, club) with player rows, oldest season first. */
export function rosterAges(s: Store, f: LeaderboardFilter = {}): RosterAgeRow[] {
  const roster = new Map<string, { year: number; club: Club; ids: Set<string> }>();
  for (const e of s.entries) {
    if (f.club && e.clubId !== f.club) continue;
    const year = s.sessionById.get(e.sessionId)!.seasonYear;
    if (!inEra(s, year, f.era)) continue;
    const key = `${year}|${e.clubId}`;
    const r = roster.get(key) ?? { year, club: s.clubById.get(e.clubId)!, ids: new Set<string>() };
    for (const ep of s.entryPlayersByEntry.get(e.id) ?? []) r.ids.add(ep.playerId);
    roster.set(key, r);
  }
  return [...roster.values()]
    .map(({ year, club, ids }) => {
      const ages: PlayerSeasonAge[] = [];
      for (const id of ids) {
        const p = s.playerById.get(id)!;
        if (p.birthYear === null) continue;
        ages.push({ player: p, club, year, age: year - p.birthYear, approx: p.birthYearApprox });
      }
      ages.sort((a, b) => a.age - b.age || a.player.sortName.localeCompare(b.player.sortName));
      return {
        year,
        club,
        players: ids.size,
        withYear: ages.length,
        approx: ages.filter((a) => a.approx).length,
        avgAge: ages.length ? ages.reduce((t, a) => t + a.age, 0) / ages.length : null,
        under25: ages.filter((a) => a.age < 25).length,
        under30: ages.filter((a) => a.age < 30).length,
        youngest: ages[0] ?? null,
        oldest: ages.length ? ages[ages.length - 1] : null,
        ages,
      };
    })
    .sort((a, b) => a.year - b.year || a.club.sortOrder - b.club.sortOrder);
}

/** Every player-season with a known age (a player counts once per season), youngest first. */
export function playerSeasonAges(s: Store, f: LeaderboardFilter = {}): PlayerSeasonAge[] {
  return rosterAges(s, f)
    .flatMap((r) => r.ages)
    .sort((a, b) => a.age - b.age || a.year - b.year || a.player.sortName.localeCompare(b.player.sortName));
}

export interface ClubAgeSummary {
  club: Club;
  /** Player-seasons (a player counts once per season he appeared). */
  playerSeasons: number;
  withYear: number;
  approx: number;
  /** Mean age over player-seasons with a birth year; null when fewer than MIN_AGE_SAMPLE. */
  avgAge: number | null;
  under25: number;
  under30: number;
  /** First and last season that contributed at least one known age. */
  firstYear: number | null;
  lastYear: number | null;
  /** Distinct players on the club's sheets, and how many of them have a birth year. */
  playersTotal: number;
  playersWithYear: number;
  youngest: PlayerSeasonAge | null;
  oldest: PlayerSeasonAge | null;
}

/** Fewer known ages than this and an average is not worth printing. */
export const MIN_AGE_SAMPLE = 5;

export function clubAgeSummary(s: Store, clubId: string): ClubAgeSummary | null {
  const club = s.clubById.get(clubId);
  if (!club) return null;
  const rows = rosterAges(s, { club: clubId });
  const ages = playerSeasonAges(s, { club: clubId });
  const played = new Set<string>();
  for (const e of s.entries) if (e.clubId === clubId) for (const ep of s.entryPlayersByEntry.get(e.id) ?? []) played.add(ep.playerId);
  const covered = rows.filter((r) => r.withYear > 0);
  return {
    club,
    playerSeasons: rows.reduce((t, r) => t + r.players, 0),
    withYear: ages.length,
    approx: ages.filter((a) => a.approx).length,
    avgAge: ages.length >= MIN_AGE_SAMPLE ? ages.reduce((t, a) => t + a.age, 0) / ages.length : null,
    under25: ages.filter((a) => a.age < 25).length,
    under30: ages.filter((a) => a.age < 30).length,
    firstYear: covered.length ? covered[0].year : null,
    lastYear: covered.length ? covered[covered.length - 1].year : null,
    playersTotal: played.size,
    playersWithYear: [...played].filter((id) => s.playerById.get(id)!.birthYear !== null).length,
    youngest: ages[0] ?? null,
    oldest: ages.length ? ages[ages.length - 1] : null,
  };
}

/** "c. 1995" for an inferred year, "1995" otherwise; same for an age. */
export function fmtApprox(n: number, approx: boolean): string {
  return `${approx ? "c. " : ""}${n}`;
}

export function fmtAge(n: number | null): string {
  return n === null ? "–" : n.toFixed(1);
}
