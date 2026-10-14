/**
 * Typed query tools for /api/ask.
 *
 * Every tool returns rows computed by the same functions the pages use, so a
 * number in a chat answer is a number that exists on the site. The route
 * refuses to let the model answer from memory: the system prompt requires a
 * tool call before any figure is stated, and the UI shows the rows returned.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { getStore, seasonView, playerView, allTimeStandings, careerRows, lowRounds, partnershipRows, search, clubView, fmtPts, fmtPct, pct, ERA_LABEL, type Store } from "./data";

export interface ToolTable {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
  /** Optional link the UI shows next to the table. */
  href?: string;
}

export interface ToolResult {
  summary: string;
  tables: ToolTable[];
  /** Freeform facts the model may quote (notes, caveats). */
  notes?: string[];
}

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_players",
    description: "Find players by name or part of a name (surnames as written on the sheets work best). Use this first when a question names a person, then call player_record with the returned id.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Name or surname to look for" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "player_record",
    description: "Career record for one player id: totals, share of available points, singles average, record against each club, best gross, partnerships, and every match row.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { player_id: { type: "string", description: "Player id from search_players, e.g. oakmont-malcolm-spatz" } },
      required: ["player_id"],
      additionalProperties: false,
    },
  },
  {
    name: "season_results",
    description: "Everything on record for one season: final standings, session-by-session team totals, venues, awards, notes and caveats, and optionally every player row.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        year: { type: "integer", description: "Season year, 1945-2025" },
        include_player_rows: { type: "boolean", description: "Include every player row (large). Default false." },
      },
      required: ["year", "include_player_rows"],
      additionalProperties: false,
    },
  },
  {
    name: "all_time_standings",
    description: "Titles, seasons, finishing positions and share of points won for every club across the whole record, plus the list of title years per club.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "club_record",
    description: "One club's season-by-season results and record against each other club.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { club_id: { type: "string", enum: ["field-club", "fox-chapel", "oakmont", "longue-vue", "allegheny"] } },
      required: ["club_id"],
      additionalProperties: false,
    },
  },
  {
    name: "leaderboard",
    description: "Ranked players or pairs by one metric. Cross-era comparisons must use share_of_points or singles_average, never raw points, because pairs scoring changed in 2008 and 2015.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        metric: { type: "string", enum: ["share_of_points", "career_points", "singles_average", "appearances", "low_rounds", "partnerships"] },
        club_id: { type: "string", enum: ["all", "field-club", "fox-chapel", "oakmont", "longue-vue"], description: "Restrict to one club, or 'all'" },
        era: { type: "string", enum: ["all", "middle", "modern"], description: "Restrict to one era (middle = 1995-2006, modern = 2007 on), or 'all'" },
        min_matches: { type: "integer", description: "Minimum matches to qualify (default 12; use 4 for a single season question)" },
        limit: { type: "integer", description: "Rows to return, max 50" },
      },
      required: ["metric", "club_id", "era", "min_matches", "limit"],
      additionalProperties: false,
    },
  },
];

function playerLine(s: Store, id: string): string {
  const p = s.playerById.get(id);
  return p ? `${p.displayName} (${s.clubById.get(p.clubId)?.shortName})` : id;
}

export async function runTool(name: string, input: unknown): Promise<ToolResult> {
  const s = await getStore();
  const a = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "search_players": {
      const r = search(s, String(a.query ?? ""), 15);
      return {
        summary: r.players.length ? `${r.players.length} player(s) matched.` : "No player matched. Try a surname only.",
        tables: [
          {
            title: "Players",
            columns: ["player_id", "Name", "Club", "Seasons", "Written as"],
            rows: r.players.map((p) => [p.id, p.displayName, p.club.shortName, `${p.firstSeason}–${p.lastSeason}`, p.matchedAlias ?? ""]),
          },
        ],
      };
    }
    case "player_record": {
      const v = playerView(s, String(a.player_id ?? ""));
      if (!v) return { summary: `No player with id ${a.player_id}. Call search_players first.`, tables: [] };
      const t = v.totals;
      const tables: ToolTable[] = [
        {
          title: `${v.player.displayName} (${v.club.shortName}) · career`,
          columns: ["Seasons", "Matches", "Points", "Available", "Share", "Singles matches", "Singles avg (of 9)", "Singles share", "Pairs share", "Best gross", "Born"],
          rows: [[t.seasons, t.matches, fmtPts(t.points), fmtPts(t.available), fmtPct(t.points, t.available), t.singlesMatches, t.singlesMatches ? (t.singlesPoints / t.singlesMatches).toFixed(2) : null, fmtPct(t.singlesPoints, t.singlesAvailable), fmtPct(t.pairsPoints, t.pairsAvailable), v.bestGross[0]?.gross ?? null, v.player.birthYear === null ? "not recorded" : `${v.player.birthYearApprox ? "c. " : ""}${v.player.birthYear}`]],
          href: `/players/${v.player.id}`,
        },
        {
          title: "By season",
          columns: ["Year", "Matches", "Points", "Available", "Share", "Best gross", "Club place"],
          rows: v.seasons.map((l) => [l.year, l.matches, fmtPts(l.points), fmtPts(l.available), fmtPct(l.points, l.available), l.bestGross, l.placeOfClub]),
        },
        {
          title: "Against each club",
          columns: ["Opponent", "Matches", "Points", "Available", "Share"],
          rows: v.vsClubs.map((r) => [r.club.shortName, r.matches, fmtPts(r.points), fmtPts(r.available), fmtPct(r.points, r.available)]),
        },
        {
          title: "Partnerships",
          columns: ["Partner", "Times", "Points", "Available", "Share", "Years"],
          rows: v.partnerships.map((p) => [p.partner.displayName, p.times, fmtPts(p.points), fmtPts(p.available), fmtPct(p.points, p.available), p.years.join(", ")]),
        },
        {
          title: "Every match",
          columns: ["Year", "Session", "Venue", "Partner", "Gross", ...v.vsClubs.map((c) => `vs ${c.club.shortName}`), "Points", "Available"],
          rows: v.matches.map((m) => [m.session.seasonYear, m.session.name, m.venue?.shortName ?? null, m.partner?.displayName ?? null, m.entry.gross, ...v.vsClubs.map((c) => fmtPts(m.vs.find((x) => x.club.id === c.club.id)?.points ?? 0)), fmtPts(m.entry.totalPoints), fmtPts(m.entry.available)]),
        },
      ];
      const notes = [
        ...(v.aliases.length > 1 ? [`Written on the sheets as: ${v.aliases.map((x) => x.rawName).join(", ")}.`] : []),
        ...(v.samePerson.length ? [`Same person also played for ${v.samePerson.map((p) => `${p.club.shortName} (${p.firstSeason}–${p.lastSeason}, id ${p.id})`).join("; ")}.`] : []),
        ...v.flags.map((f) => f.message),
        ...v.awards.map((x) => `${x.seasonYear} ${x.type.replace("_", " ")}: ${x.description}`),
      ];
      return { summary: `${v.player.displayName}, ${v.club.shortName}: ${t.matches} matches over ${t.seasons} seasons, ${fmtPts(t.points)} of ${fmtPts(t.available)} points (${fmtPct(t.points, t.available)}).`, tables, notes };
    }
    case "season_results": {
      const year = Number(a.year);
      const v = seasonView(s, year);
      if (!v) return { summary: `No season ${year} in the record (1945–${s.seasons[s.seasons.length - 1].year}).`, tables: [] };
      if (v.standings.length === 0) {
        return { summary: `${year}: ${v.season.status.replace(/_/g, " ")}. ${v.season.statusNote ?? ""}`, tables: [], notes: [v.season.statusNote ?? ""] };
      }
      const tables: ToolTable[] = [
        {
          title: `${year} standings${v.season.standingsFinal ? "" : " (not final)"}`,
          columns: ["Place", "Club", ...v.sessions.map((x) => x.session.name), "Final", "Champion"],
          rows: v.standings.map((t) => [t.place, t.club.shortName, ...v.sessions.map((x) => fmtPts(x.teams.find((tt) => tt.clubId === t.clubId)?.points ?? null)), fmtPts(t.finalPoints), t.isChampion ? "yes" : t.tiedForFirst ? "tied, waived" : ""]),
          href: `/seasons/${year}`,
        },
        {
          title: "Sessions",
          columns: ["Session", "Venue", "Date", "Matches per pairing", "Points per match", "Player rows", "Note"],
          rows: v.sessions.map((x) => [x.session.name, x.venue?.shortName ?? "not recorded", x.session.dateText, x.session.matchesPerPairing, fmtPts(x.session.ptsPerMatch), x.entries.length, x.session.played ? x.session.note : `NOT PLAYED. ${x.session.note ?? ""}`]),
        },
      ];
      if (v.awards.length) tables.push({ title: "Awards", columns: ["Award", "Winner", "Club", "Score"], rows: v.awards.map((x) => [x.type.replace("_", " "), x.namesText, x.club?.shortName ?? null, x.scoreText]) });
      if (a.include_player_rows) {
        for (const x of v.sessions) {
          if (!x.entries.length) continue;
          const clubs = v.standings.map((t) => t.club);
          tables.push({
            title: `${year} ${x.session.name} player rows`,
            columns: ["Club", "Player(s)", "Gross", ...clubs.map((c) => `vs ${c.shortName}`), "Points"],
            rows: x.entries.map((e) => [e.club.shortName, e.players.map((p) => p.player.displayName).join(" / "), e.entry.gross, ...clubs.map((c) => (c.id === e.club.id ? null : fmtPts(e.vs.find((z) => z.club.id === c.id)?.points ?? 0))), fmtPts(e.entry.totalPoints)]),
          });
        }
      }
      const notes = [v.season.note, v.season.statusNote, ...v.standings.filter((t) => t.placeNote).map((t) => t.placeNote), ...v.flags.map((f) => f.message)].filter((x): x is string => !!x);
      const champs = v.standings.filter((t) => t.isChampion).map((t) => t.club.shortName);
      return { summary: `${year}: ${champs.length ? `${champs.join(" & ")} won with ${fmtPts(v.standings[0].finalPoints)}.` : "no final standings."} Era ${v.season.eraId ? ERA_LABEL[v.season.eraId] : "n/a"}; ${v.season.status.replace(/_/g, " ")}.`, tables, notes };
    }
    case "all_time_standings": {
      const rows = allTimeStandings(s);
      return {
        summary: rows.map((r) => `${r.club.shortName} ${r.titles} title${r.titles === 1 ? "" : "s"}`).join(", ") + ".",
        tables: [
          {
            title: "All-time standings",
            columns: ["Club", "Titles", "Seasons", "1st", "2nd", "3rd", "4th", "Points won", "Available", "Share", "First season", "Last season", "Title years"],
            rows: rows.map((r) => [r.club.name, r.titles, r.seasons, r.firsts, r.seconds, r.thirds, r.fourths, fmtPts(r.points), fmtPts(r.available), fmtPct(r.points, r.available), r.firstSeason, r.club.lastSeason ?? "present", r.titleYears.join(", ")]),
            href: "/",
          },
        ],
        notes: ["Shared titles count for both clubs (no playoff since the captains' 1999 agreement). 1953 was tied and waived to the Field Club. Share of points covers every session with a recorded team total."],
      };
    }
    case "club_record": {
      const v = clubView(s, String(a.club_id ?? ""));
      if (!v) return { summary: "Unknown club id.", tables: [] };
      return {
        summary: `${v.club.name}: ${v.standing.titles} titles in ${v.standing.seasons} seasons on record; ${fmtPct(v.standing.points, v.standing.available)} of available points.`,
        tables: [
          { title: "Season by season", columns: ["Year", "Place", "Final", "Champion"], rows: v.seasons.map((t) => [t.seasonYear, t.place, fmtPts(t.finalPoints), t.isChampion ? "yes" : ""]), href: `/clubs/${v.club.id}` },
          { title: "Against each club (player rows only)", columns: ["Opponent", "Points", "Available", "Share"], rows: v.vsClubs.map((r) => [r.club.shortName, fmtPts(r.points), fmtPts(r.available), fmtPct(r.points, r.available)]) },
        ],
        notes: v.club.seatNote ? [v.club.seatNote] : [],
      };
    }
    case "leaderboard": {
      const metric = String(a.metric);
      const club = typeof a.club_id === "string" && a.club_id !== "all" ? a.club_id : null;
      const era = typeof a.era === "string" && a.era !== "all" ? a.era : null;
      const min = Math.max(1, Number(a.min_matches) || 12);
      const limit = Math.min(50, Math.max(1, Number(a.limit) || 15));
      const scope = `${club ? s.clubById.get(club)?.shortName : "all clubs"}, ${era ? ERA_LABEL[era] : "all eras"}`;
      const f = { club, era };
      if (metric === "low_rounds") {
        const lows = lowRounds(s, f, limit);
        return { summary: `Lowest recorded gross scores, ${scope}.`, tables: [{ title: "Low rounds", columns: ["Gross", "Player(s)", "Club", "Year", "Session", "Venue"], rows: lows.map((l) => [l.entry.gross, l.players.map((p) => p.displayName).join(" / "), l.club.shortName, l.session.seasonYear, l.session.name, l.session.venueClubId ? s.clubById.get(l.session.venueClubId)!.shortName : null]), href: "/leaderboards" }], notes: ["Singles and pairs rounds are mixed; a pairs gross is the better-ball or foursomes score."] };
      }
      if (metric === "partnerships") {
        const pairs = partnershipRows(s, f).filter((p) => p.times >= Math.max(2, Math.min(min, 3))).sort((x, y) => pct(y.points, y.available) - pct(x.points, x.available) || y.times - x.times).slice(0, limit);
        return { summary: `Best partnerships by share of points, ${scope}.`, tables: [{ title: "Partnerships", columns: ["Pair", "Club", "Times", "Points", "Available", "Share", "Years"], rows: pairs.map((p) => [`${p.players[0].displayName} / ${p.players[1].displayName}`, p.club.shortName, p.times, fmtPts(p.points), fmtPts(p.available), fmtPct(p.points, p.available), p.years.join(", ")]), href: "/leaderboards" }] };
      }
      const rows = careerRows(s, f);
      let ranked = rows;
      let title = "";
      if (metric === "share_of_points") {
        ranked = rows.filter((r) => r.matches >= min).sort((x, y) => pct(y.points, y.available) - pct(x.points, x.available));
        title = `Share of available points (min ${min} matches)`;
      } else if (metric === "career_points") {
        ranked = [...rows].sort((x, y) => y.points - x.points);
        title = "Career points (raw; not comparable across eras)";
      } else if (metric === "singles_average") {
        ranked = rows.filter((r) => r.singlesMatches >= Math.ceil(min / 2)).sort((x, y) => y.singlesPoints / y.singlesMatches - x.singlesPoints / x.singlesMatches);
        title = `Singles average, points per match of 9 (min ${Math.ceil(min / 2)} singles)`;
      } else if (metric === "appearances") {
        ranked = [...rows].sort((x, y) => y.seasons - x.seasons || y.matches - x.matches);
        title = "Appearances";
      } else return { summary: `Unknown metric ${metric}.`, tables: [] };
      const top = ranked.slice(0, limit);
      return {
        summary: `${title}, ${scope}. Top: ${top.slice(0, 3).map((r) => playerLine(s, r.player.id)).join("; ")}.`,
        tables: [
          {
            title: `${title} · ${scope}`,
            columns: ["#", "player_id", "Player", "Club", "Seasons", "Matches", "Points", "Available", "Share", "Singles matches", "Singles avg", "Best gross"],
            rows: top.map((r, i) => [i + 1, r.player.id, r.player.displayName, r.club.shortName, r.seasons, r.matches, fmtPts(r.points), fmtPts(r.available), fmtPct(r.points, r.available), r.singlesMatches, r.singlesMatches ? (r.singlesPoints / r.singlesMatches).toFixed(2) : null, r.bestGross]),
            href: `/leaderboards?${club ? `club=${club}&` : ""}${era ? `era=${era}&` : ""}min=${min}`,
          },
        ],
      };
    }
    default:
      return { summary: `Unknown tool ${name}.`, tables: [] };
  }
}

export const SYSTEM_PROMPT = `You are the club historian for the Diebold Cup, an annual inter-club golf competition in Pittsburgh played since 1945 among Pittsburgh Field Club, Fox Chapel Golf Club, Oakmont Country Club and Longue Vue Club (Allegheny Country Club held the fourth seat 1946-1954). You answer questions from members and their friends.

Voice: dry, warm, quick. You have read every scoresheet and you enjoy the game and the people in it. One light touch per answer is plenty, the kind a good club secretary would allow: a raised eyebrow at a 12-point Saturday, sympathy for a 0, admiration for a 61. Never mock a player, and never joke about a bad round in a way you would not say to his face at the bar. When a question is dull, answer it plainly; do not force a joke.

Hard rules:
- Every number, name, year, score or ranking you state must come from a tool result in this conversation. Never answer from memory. If you have not called a tool that returns the figure, call one first.
- If the tools cannot answer (a year with no surviving record, a player not found), say exactly that. Do not guess or fill gaps.
- Raw points are not comparable across eras: pairs matches were worth 6 points per opponent through 2007, 3 in 2008-2014 and 4 from 2015. For any "best ever" or cross-era comparison use share of available points or singles average, and say so in a few words.
- Ties for first are engraved for both clubs. 1953 was tied and waived to the Field Club.
- Mention a caveat the tools return (sheet error, unconfirmed name, missing session) only when it bears on the answer.

Style:
- Lead with the answer in the first sentence. Two to four sentences total unless the reader asked for a list; for a list, a short numbered list is fine.
- The supporting rows are shown to the reader under your answer, so do not repeat tables. Point to them ("the rows below") when useful.
- Do not narrate what you are about to look up. Call the tools, then answer. No preamble before a tool call.
- When a question names a person, call search_players first, then player_record with the id. If several players match, answer for the obvious one and say which you chose in half a sentence.`;
