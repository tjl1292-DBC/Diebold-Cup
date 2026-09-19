# Diebold Cup

Results archive for the Diebold Cup, the annual inter-club match among
Pittsburgh Field Club, Fox Chapel Golf Club, Oakmont Country Club and Longue
Vue Club (Allegheny Country Club 1946-1954), played since 1945.

Next.js (App Router, TypeScript, Tailwind) on Vercel. Data lives in SQLite via
Drizzle and is rebuilt from the workbook by a script. The workbook is the source
of truth; the database is a build artifact.

## Layout

```
data/source/*.xlsx            the digitized archive (Player Results, Season History, ...)
data/config/clubs.json        clubs, sheet spellings, seat tenure (Allegheny / Longue Vue)
data/config/scoring.json      eras, points per match by year, session slots, per-session overrides
data/config/seasons.json      archive gaps, season caveats, who was engraved in tied years
data/overrides/players.yaml   player identity fixes you edit by hand
data/overrides/known-issues.yaml  validator findings you have looked at and accepted
data/diebold.db               built by `npm run import` (gitignored)
scripts/import.ts             workbook -> database, idempotent
scripts/validate.ts           arithmetic checks; CI fails on unacknowledged errors
src/db/schema.ts              Drizzle schema
src/lib/names.ts              name parsing, nickname folding
src/lib/resolve.ts            player identity resolution
content/documents/*.md        founding documents: transcription + scan references
reports/                      written on every run: resolution, import summary, validation
```

## Commands

```bash
npm run import          # rebuild data/diebold.db from the workbook
npm run validate        # run the checks, write reports/validation.md, exit 1 on new errors
npm run data            # both
npm run import -- --dry-run   # parse + reports only, database untouched
npm run db:studio       # browse the database
```

## Adding a season

1. Add the rows to the workbook: Season History (one row per club) and Player
   Results (one row per scoresheet line). Keep the same columns. A blank
   Total Pts is fine; the importer rebuilds it from the per-opponent columns
   and flags the row as `total_derived`.
2. If a session used a different team size or points, add a
   `sessionOverrides` entry in `data/config/scoring.json`. If the Saturday
   order was flipped, add a `slotOverrides` entry. If the pairs points change
   again, add a range to `pairs.ptsPerMatchByYear`.
3. `npm run data`. Read `reports/validation.md`. Every head-to-head pairing
   must sum to matches x points per match; every club's rows must match the
   recorded session total. A failure is almost always a number in the wrong
   column.
4. Read `reports/player-resolution.md`. New spellings are matched to existing
   players by full name, then initial + surname, then surname, always
   preferring the player active nearest that year. Anything low-confidence is
   listed with its alternatives.

No migration is needed for new data. `drizzle-kit generate` is only needed if
`src/db/schema.ts` changes.

## Fixing a player

Edit `data/overrides/players.yaml`, then `npm run import`.

- Wrong person: add an `aliases` rule pinning that spelling (optionally for a
  year range) to the right player id. Ids are in the resolution report.
- Two players merged that should be separate, or vice versa: define the player
  under `players` with a stable id, then pin spellings to it with `aliases`.
- Same person at two clubs: add a `people` entry listing both player ids.

Player ids are URL slugs. Once the site is public, pin any id you care about
under `players` so a spelling change in the workbook cannot rename it.

## Accepting a validator finding

If a finding is an error on the original sheet rather than a transcription
error, add its key (from `reports/validation.md`) to
`data/overrides/known-issues.yaml` with a reason. It still becomes a DataFlag
and the site still shows it; CI just stops failing on it.

## Data model in one paragraph

A `Season` has `Sessions` (four in the modern era, one per match in 1945-54).
Each session carries its own scoring rule (`ptsPerMatch`, `matchesPerPairing`)
because pairs scoring changed in 2008 and 2015. An `Entry` is one scoresheet
line (a player in singles, a pair otherwise) with its `EntryOpponentPoints` and
its `available` points, so any leaderboard spanning eras divides points by
available rather than comparing raw totals. A `Player` is one person at one
club; `personId` joins the same human across clubs. `DataFlags` hold every
sheet note, transcription caveat and validator finding so the UI can show them
next to the numbers. Archive gaps are `Season` rows with a status
(`newspaper_only`, `no_documents`), never missing years.

## The site

```
/                     all-time standings, latest result, timeline, search
/seasons, /seasons/2019
/players, /players/oakmont-malcolm-spatz
/clubs, /clubs/oakmont
/leaderboards?club=&era=&min=
/history              founding documents (content/documents), scoring, archive gaps
/search?q=            players (any spelling on the sheets), years, clubs
/ask                  question box; POST /api/ask
```

`src/lib/data.ts` loads the whole database into memory once per server and
every page and every chat tool computes from it, so a number on a page and a
number in a chat answer come from the same function.

### The question box

`/api/ask` calls Claude with six tools (`src/lib/ask-tools.ts`) that are typed
queries over the same read model the pages use. The system prompt forbids
stating a figure that did not come back from a tool, and the response carries
every tool result so the page renders the supporting rows under the answer.
It needs `ANTHROPIC_API_KEY` in the environment; without it the page explains
that it is switched off and everything else keeps working.

## Running locally

```bash
npm install
npm run data      # build data/diebold.db and check it
npm run dev       # http://localhost:3000
```

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, "Add New Project", pick the repository, keep the defaults
   (framework Next.js, build command `npm run build`). The build command runs
   the import first, so the database is rebuilt from the workbook on every
   deploy and shipped with the server functions.
3. Under Environment Variables add `ANTHROPIC_API_KEY` if you want the
   question box on. Nothing else is required.
4. Every later push to the main branch redeploys. Adding a season is: edit the
   workbook, commit, push.

To move to a hosted database later, set `DATABASE_URL` to a Turso URL and
`DATABASE_AUTH_TOKEN`; no query code changes.
