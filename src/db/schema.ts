/**
 * Diebold Cup database schema (SQLite via Drizzle).
 *
 * Design notes
 * ------------
 * - The workbook is the source of truth. `scripts/import.ts` rebuilds every
 *   table from it inside one transaction, so the import is idempotent and
 *   adding a season never needs a migration: add rows to the sheet, re-run.
 * - Scoring rules live on Session (ptsPerMatch, matchesPerPairing), not in
 *   code, because pairs scoring changed three times. Cross-era comparisons
 *   must divide by `available` points, never compare raw totals.
 * - Every archive gap is a Season row with a `status`, so the timeline can
 *   render 1964-1994 as "no documents survive" instead of skipping it.
 * - Every scorekeeper quirk, transcription note and validator finding is a
 *   DataFlag row, so the UI has one place to look when it wants to say
 *   "this number is disputed".
 */
import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

export const clubs = sqliteTable("clubs", {
  id: text("id").primaryKey(), // slug: field-club, fox-chapel, oakmont, longue-vue, allegheny
  name: text("name").notNull(), // "Pittsburgh Field Club"
  shortName: text("short_name").notNull(), // "Field Club" — the label used on the sheets
  abbreviation: text("abbreviation").notNull(), // PFC, FCGC, OCC, LVC, ACC
  /** First season the club held a seat. */
  firstSeason: integer("first_season").notNull(),
  /** Is firstSeason documented, or only the first season we have a record of? */
  firstSeasonCertain: integer("first_season_certain", { mode: "boolean" }).notNull().default(true),
  /** Null = still competing. */
  lastSeason: integer("last_season"),
  lastSeasonCertain: integer("last_season_certain", { mode: "boolean" }).notNull().default(true),
  /** Prose for the club page: "Held the fourth seat 1946-1954; replaced by Longue Vue at an unknown date." */
  seatNote: text("seat_note"),
  sortOrder: integer("sort_order").notNull(),
});

// ---------------------------------------------------------------------------
// Eras and seasons
// ---------------------------------------------------------------------------

export const eras = sqliteTable("eras", {
  id: text("id").primaryKey(), // early | middle | modern
  name: text("name").notNull(),
  fromYear: integer("from_year").notNull(),
  toYear: integer("to_year"), // null = open-ended
  description: text("description").notNull(),
});

/**
 * Season status:
 *  complete          player rows for every session
 *  partial           player rows exist but a session is missing (2022)
 *  team_totals_only  Season History row only (1945-54, 1995-2006, 2011)
 *  newspaper_only    1955-1963
 *  no_documents      1964-1994, 1996
 */
export type SeasonStatus = "complete" | "partial" | "team_totals_only" | "newspaper_only" | "no_documents";

export const seasons = sqliteTable("seasons", {
  year: integer("year").primaryKey(),
  eraId: text("era_id").references(() => eras.id),
  status: text("status").$type<SeasonStatus>().notNull(),
  /** False when no final placings can be given (2022 has no Friday sheet). */
  standingsFinal: integer("standings_final", { mode: "boolean" }).notNull().default(true),
  hasPlayerRows: integer("has_player_rows", { mode: "boolean" }).notNull().default(false),
  clubCount: integer("club_count"), // 3 in 1945, otherwise 4
  datesText: text("dates_text"), // as written: "Aug 2-4, 2019"
  note: text("note"), // Season History note column
  /** Gap explanation or data-quality caveat shown on the timeline. */
  statusNote: text("status_note"),
});

// ---------------------------------------------------------------------------
// Sessions (a scoring unit: one modern-era session or one early-era match day)
// ---------------------------------------------------------------------------

export type SessionFormat = "singles" | "foursomes" | "four_ball";

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // "2019-3"
    seasonYear: integer("season_year").notNull().references(() => seasons.year),
    ordinal: integer("ordinal").notNull(), // 1..4
    /** Stable key for the slot regardless of format: fri | sat_am | sat_pm | sun | match (early era). */
    slot: text("slot").notNull(),
    format: text("format").$type<SessionFormat>().notNull(),
    /** Display label: "Friday Singles", "Saturday AM Foursomes", "Match 2". */
    name: text("name").notNull(),
    /** Label exactly as it appears in the Player Results Session column, for round-tripping. */
    sheetLabel: text("sheet_label"),
    venueClubId: text("venue_club_id").references(() => clubs.id),
    venueCertain: integer("venue_certain", { mode: "boolean" }).notNull().default(true),
    venueNote: text("venue_note"),
    dateText: text("date_text"),
    /** Scoring rule in force for this session. */
    ptsPerMatch: real("pts_per_match").notNull(), // 3 singles; 6 / 3 / 4 pairs by era
    matchesPerPairing: integer("matches_per_pairing").notNull(), // 8 singles, 4 pairs
    playersPerEntry: integer("players_per_entry").notNull(), // 1 or 2
    hasPlayerRows: integer("has_player_rows", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("sessions_year_ordinal").on(t.seasonYear, t.ordinal)],
);

// ---------------------------------------------------------------------------
// Team results
// ---------------------------------------------------------------------------

export const teamSessionResults = sqliteTable(
  "team_session_results",
  {
    sessionId: text("session_id").notNull().references(() => sessions.id),
    clubId: text("club_id").notNull().references(() => clubs.id),
    /** Points as recorded on the sheet / in Season History. Null = not recorded. */
    points: real("points"),
    /** Sum of this club's entry rows in the session; null when there are no rows. */
    pointsFromRows: real("points_from_rows"),
    /** Maximum this club could have scored in the session (opponents x matches x pts). */
    available: real("available"),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.clubId] })],
);

export const teamSeasonResults = sqliteTable(
  "team_season_results",
  {
    seasonYear: integer("season_year").notNull().references(() => seasons.year),
    clubId: text("club_id").notNull().references(() => clubs.id),
    /** Final as recorded. */
    finalPoints: real("final_points"),
    /** Sum of recorded session points; differs from finalPoints in 1949 and 1997. */
    sumOfSessions: real("sum_of_sessions"),
    place: integer("place"), // null when standings are not final
    /** True for every club engraved that year; 1953 has one (Oakmont waived). */
    isChampion: integer("is_champion", { mode: "boolean" }).notNull().default(false),
    /** True when the club tied for first regardless of who was engraved. */
    tiedForFirst: integer("tied_for_first", { mode: "boolean" }).notNull().default(false),
    placeNote: text("place_note"),
  },
  (t) => [primaryKey({ columns: [t.seasonYear, t.clubId] })],
);

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

/**
 * A Player is one person *at one club*. The same human who played for two
 * clubs (Jim Bulger: Fox Chapel 2007-10, Oakmont 2014-15) is two Player rows
 * joined by `personId`. The prototype keyed players on club + surname +
 * initial; here identity is resolved by scripts/import.ts using full names,
 * a nickname table, year proximity, and the overrides file — see
 * data/overrides/players.yaml.
 */
export const players = sqliteTable(
  "players",
  {
    id: text("id").primaryKey(), // slug, stable and URL-safe: "oakmont-jim-sullivan-jr"
    clubId: text("club_id").notNull().references(() => clubs.id),
    displayName: text("display_name").notNull(), // "Jim Sullivan Jr."
    givenName: text("given_name"), // null when only a surname or initial is known
    /** First initial(s) when the given name is unknown: "J", "JM". */
    initials: text("initials"),
    surname: text("surname").notNull(),
    suffix: text("suffix"), // Jr | Sr | II | III | IV
    sortName: text("sort_name").notNull(), // "sullivan, jim jr"
    /** Groups Player rows that are the same human across clubs. */
    personId: text("person_id"),
    firstSeason: integer("first_season"),
    lastSeason: integer("last_season"),
    /** "override" when defined in players.yaml, else "auto". */
    source: text("source").notNull().default("auto"),
    /** Set by the resolver when identity is uncertain (e.g. suffix-less "Jim Sullivan" with a Jr and Sr on the roster). */
    needsReview: integer("needs_review", { mode: "boolean" }).notNull().default(false),
    reviewNote: text("review_note"),
    note: text("note"), // free text from overrides, shown on the player page
  },
  (t) => [index("players_club").on(t.clubId), index("players_surname").on(t.surname)],
);

/**
 * Every distinct spelling that resolved to a player, with how and how
 * confidently. One row per (club, raw spelling, player). The per-entry
 * resolution detail is on entryPlayers; this table is the roll-up the
 * player page shows as "also appears as".
 */
export const playerAliases = sqliteTable(
  "player_aliases",
  {
    playerId: text("player_id").notNull().references(() => players.id),
    clubId: text("club_id").notNull().references(() => clubs.id),
    rawName: text("raw_name").notNull(),
    occurrences: integer("occurrences").notNull(),
    firstYear: integer("first_year").notNull(),
    lastYear: integer("last_year").notNull(),
    source: text("source").notNull(), // auto | override
  },
  (t) => [primaryKey({ columns: [t.clubId, t.rawName, t.playerId] })],
);

// ---------------------------------------------------------------------------
// Entries: one line on a scoresheet (a player in singles, a pair otherwise)
// ---------------------------------------------------------------------------

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(), // "2019-3-oakmont-2" (session, club, line)
    sessionId: text("session_id").notNull().references(() => sessions.id),
    clubId: text("club_id").notNull().references(() => clubs.id),
    lineNo: integer("line_no").notNull(), // order within the club's block on the sheet
    /** Player(s) exactly as transcribed: "A. Hodge / E. Ruhling". */
    rawNames: text("raw_names").notNull(),
    gross: integer("gross"),
    /** Total Pts as recorded on the sheet. Null if the sheet had none (cropped scans). */
    totalRecorded: real("total_recorded"),
    /** Sum of the per-opponent columns. This is the number the site uses. */
    totalPoints: real("total_points").notNull(),
    /** Points available to this entry: opponents x ptsPerMatch. */
    available: real("available").notNull(),
    /** True when totalRecorded was blank and totalPoints was rebuilt from components. */
    totalDerived: integer("total_derived", { mode: "boolean" }).notNull().default(false),
    /** Notes column from the sheet, verbatim. */
    sheetNote: text("sheet_note"),
    /** Workbook sheet name + 1-based row, for tracing back to the source. */
    sourceRef: text("source_ref").notNull(),
  },
  (t) => [index("entries_session").on(t.sessionId), index("entries_club").on(t.clubId)],
);

export const entryPlayers = sqliteTable(
  "entry_players",
  {
    entryId: text("entry_id").notNull().references(() => entries.id),
    playerId: text("player_id").notNull().references(() => players.id),
    position: integer("position").notNull(), // 1 or 2, order as written
    rawName: text("raw_name").notNull(), // the token for this player: "E. Ruhling"
    /** exact_full_name | override | suffix_merge | initial_single | initial_by_year | surname_single | surname_by_year | new_identity */
    method: text("method").notNull(),
    confidence: text("confidence").notNull(), // high | medium | low
    /** JSON array of candidate player ids when the choice was not forced. */
    candidates: text("candidates"),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.position] }), index("entry_players_player").on(t.playerId)],
);

export const entryOpponentPoints = sqliteTable(
  "entry_opponent_points",
  {
    entryId: text("entry_id").notNull().references(() => entries.id),
    opponentClubId: text("opponent_club_id").notNull().references(() => clubs.id),
    points: real("points").notNull(),
    available: real("available").notNull(), // ptsPerMatch for the session
  },
  (t) => [primaryKey({ columns: [t.entryId, t.opponentClubId] }), index("eop_opponent").on(t.opponentClubId)],
);

// ---------------------------------------------------------------------------
// Awards (Low Gross, Scotch Match, Better Ball — from the secretary's letters)
// ---------------------------------------------------------------------------

export const awards = sqliteTable("awards", {
  id: text("id").primaryKey(),
  seasonYear: integer("season_year").notNull().references(() => seasons.year),
  type: text("type").notNull(), // low_gross | scotch | better_ball
  clubId: text("club_id").references(() => clubs.id),
  /** Verbatim from the letter: "Sutherland/Sullivan Jr & R. Wagner/Spatz (OCC) 73 (tie)". */
  description: text("description").notNull(),
  namesText: text("names_text"), // "Sutherland/Sullivan Jr"
  scoreText: text("score_text"), // "73", "69-78-147"
  tied: integer("tied", { mode: "boolean" }).notNull().default(false),
  /** Best-effort link to the scoresheet line (Scotch / Better Ball); null when it could not be matched. */
  entryId: text("entry_id").references(() => entries.id),
  /** Best-effort link to the player (Low Gross); null when it could not be matched. */
  playerId: text("player_id").references(() => players.id),
});

// ---------------------------------------------------------------------------
// Data flags: everything the site should show rather than hide
// ---------------------------------------------------------------------------

export type FlagSeverity = "info" | "warning" | "error";

export const dataFlags = sqliteTable(
  "data_flags",
  {
    id: text("id").primaryKey(),
    /** sheet_note | season_note | total_mismatch | total_derived | session_total_mismatch | season_sum_mismatch |
     *  h2h_imbalance | venue_assumed | venue_unknown | missing_session | identity_ambiguous | identity_review | import_warning */
    kind: text("kind").notNull(),
    severity: text("severity").$type<FlagSeverity>().notNull(),
    /** "sheet" for notes carried from the workbook, "validator" for scripts/validate.ts findings. */
    source: text("source").notNull(),
    seasonYear: integer("season_year").references(() => seasons.year),
    sessionId: text("session_id").references(() => sessions.id),
    clubId: text("club_id").references(() => clubs.id),
    entryId: text("entry_id").references(() => entries.id),
    playerId: text("player_id").references(() => players.id),
    message: text("message").notNull(),
    /** True when listed in data/overrides/known-issues.yaml; CI ignores acknowledged errors. */
    acknowledged: integer("acknowledged", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("flags_season").on(t.seasonYear), index("flags_entry").on(t.entryId), index("flags_player").on(t.playerId)],
);

// ---------------------------------------------------------------------------
// Founding documents (scans + transcriptions), loaded from content/documents
// ---------------------------------------------------------------------------

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(), // slug from filename
  title: text("title").notNull(),
  kind: text("kind").notNull(), // bylaws | letter | minutes | newspaper | photo | other
  dateText: text("date_text"),
  sortOrder: integer("sort_order").notNull(),
  /** Markdown transcription. */
  body: text("body").notNull(),
  /** JSON array of {src, caption} for scans in public/documents/. */
  images: text("images").notNull().default("[]"),
  summary: text("summary"),
});

// ---------------------------------------------------------------------------
// Import bookkeeping
// ---------------------------------------------------------------------------

export const importRuns = sqliteTable("import_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ranAt: text("ran_at").notNull(),
  sourceFile: text("source_file").notNull(),
  sourceSha256: text("source_sha256").notNull(),
  entryCount: integer("entry_count").notNull(),
  playerCount: integer("player_count").notNull(),
  summary: text("summary").notNull(), // JSON
});
