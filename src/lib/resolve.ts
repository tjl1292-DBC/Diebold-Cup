/**
 * Player identity resolution.
 *
 * Input: every name token on every scoresheet line, plus the overrides file.
 * Output: a set of Player identities (one per person per club), an assignment
 * for every token with method + confidence + candidates, and review notes.
 *
 * Order of precedence (see data/overrides/players.yaml for the prose version):
 *   1. alias rule in overrides
 *   2. exact full name after nickname folding
 *   3. suffix-less full name -> the single suffixed identity with the same name
 *   4. initial + surname -> nearest-in-time identity with that surname/initial
 *   5. surname only      -> nearest-in-time identity with that surname
 *   6. new identity from whatever was written
 */
import { parseName, slugify, suffixDisplay, type ParsedName, type Suffix } from "./names";

export type Method =
  | "override"
  | "exact_full_name"
  | "suffix_merge"
  | "initial_single"
  | "initial_by_year"
  | "surname_single"
  | "surname_by_year"
  | "new_identity";

export type Confidence = "high" | "medium" | "low";

export interface Token {
  /** Unique key for the token's slot: `${entryId}:${position}`. */
  key: string;
  clubId: string;
  raw: string;
  year: number;
}

export interface OverridePlayer {
  id: string;
  club: string;
  displayName: string;
  givenName?: string | null;
  surname: string;
  suffix?: string | null;
  note?: string | null;
}

export interface OverrideAlias {
  club: string;
  name: string;
  player: string;
  years?: [number, number];
}

export interface OverridePerson {
  name: string;
  players: string[];
}

export interface Overrides {
  players?: OverridePlayer[];
  aliases?: OverrideAlias[];
  people?: OverridePerson[];
}

export interface Identity {
  id: string; // slug, assigned at the end
  clubId: string;
  /** Identity key: club|surnameKey|givenCanon-or-initial|suffix */
  key: string;
  surnameKey: string;
  givenCanon: string | null;
  initials: string | null;
  suffix: Suffix | null;
  /** spelling -> count, over full-name tokens only (used for display name). */
  givenSpellings: Map<string, number>;
  surnameSpellings: Map<string, number>;
  years: number[]; // every year with an assigned token
  tokenCount: number;
  source: "auto" | "override";
  overrideId?: string;
  displayNameOverride?: string;
  note?: string | null;
  needsReview: boolean;
  reviewNote: string | null;
  personId: string | null;
}

export interface Assignment {
  tokenKey: string;
  identity: Identity;
  method: Method;
  confidence: Confidence;
  candidates: Identity[];
  parsed: ParsedName;
}

export interface ResolveResult {
  identities: Identity[];
  assignments: Map<string, Assignment>;
  /** Human-readable notes for the report. */
  warnings: string[];
}

function identityKey(clubId: string, surnameKey: string, givenOrInitial: string | null, suffix: Suffix | null): string {
  return `${clubId}|${surnameKey}|${givenOrInitial ?? ""}|${suffix ?? ""}`;
}

function bump(map: Map<string, number>, k: string) {
  map.set(k, (map.get(k) ?? 0) + 1);
}

function mostCommon(map: Map<string, number>): string | null {
  let best: string | null = null;
  let n = -1;
  for (const [k, v] of map) if (v > n) [best, n] = [k, v];
  return best;
}

function span(id: Identity): [number, number] | null {
  if (id.years.length === 0) return null;
  return [Math.min(...id.years), Math.max(...id.years)];
}

/** 0 when the year is inside (or adjacent to) the identity's active span, otherwise the distance to it. */
function yearDistance(id: Identity, year: number): number {
  const s = span(id);
  if (!s) return 99;
  if (year >= s[0] - 1 && year <= s[1] + 1) return 0;
  return year < s[0] ? s[0] - year : year - s[1];
}

function pick(candidates: Identity[], year: number): { chosen: Identity; confidence: Confidence; tie: boolean } {
  const scored = candidates.map((c) => ({ c, d: yearDistance(c, year) }));
  const best = Math.min(...scored.map((s) => s.d));
  const atBest = scored.filter((s) => s.d === best).sort((a, b) => b.c.tokenCount - a.c.tokenCount);
  const tie = atBest.length > 1 && atBest[0].c.tokenCount === atBest[1].c.tokenCount;
  const chosen = atBest[0].c;
  let confidence: Confidence;
  if (candidates.length === 1) confidence = "high";
  else if (best === 0 && atBest.length === 1) confidence = "medium";
  else confidence = "low";
  return { chosen, confidence, tie };
}

export function displayNameFor(id: Identity): string {
  if (id.displayNameOverride) return id.displayNameOverride;
  const given = mostCommon(id.givenSpellings);
  const surname = mostCommon(id.surnameSpellings) ?? id.surnameKey;
  const first = given ?? (id.initials ? `${id.initials.split("").join(".")}.` : null);
  return [first, surname, suffixDisplay(id.suffix)].filter(Boolean).join(" ");
}

export function resolvePlayers(tokens: Token[], overrides: Overrides): ResolveResult {
  const warnings: string[] = [];
  const identities = new Map<string, Identity>(); // by key
  const byOverrideId = new Map<string, Identity>();
  const assignments = new Map<string, Assignment>();
  const parsedTokens = tokens.map((t) => ({ t, p: parseName(t.raw) }));

  const newIdentity = (clubId: string, p: ParsedName, source: "auto" | "override" = "auto"): Identity => {
    const givenOrInitial = p.givenCanon ?? p.initials ?? null;
    const key = identityKey(clubId, p.surnameKey, givenOrInitial, p.suffix);
    let id = identities.get(key);
    if (!id) {
      id = {
        id: "",
        clubId,
        key,
        surnameKey: p.surnameKey,
        givenCanon: p.givenCanon,
        initials: p.initials,
        suffix: p.suffix,
        givenSpellings: new Map(),
        surnameSpellings: new Map(),
        years: [],
        tokenCount: 0,
        source,
        needsReview: false,
        reviewNote: null,
        personId: null,
      };
      identities.set(key, id);
    }
    return id;
  };

  const used = new Map<string, Identity>();
  const finalizeSlug = (id: Identity) => {
    if (id.id) return;
    let slug = id.overrideId ?? provisionalSlug(id);
    if (used.has(slug)) {
      let n = 2;
      while (used.has(`${slug}-${n}`)) n++;
      warnings.push(`Slug collision: ${slug} used by two identities; second became ${slug}-${n}. Pin one in players.yaml.`);
      slug = `${slug}-${n}`;
    }
    id.id = slug;
    used.set(slug, id);
  };

  const assign = (t: Token, p: ParsedName, id: Identity, method: Method, confidence: Confidence, candidates: Identity[] = []) => {
    id.years.push(t.year);
    id.tokenCount += 1;
    if (p.given) bump(id.givenSpellings, p.given);
    bump(id.surnameSpellings, p.surname);
    assignments.set(t.key, { tokenKey: t.key, identity: id, method, confidence, candidates, parsed: p });
  };

  // ---- 0. Override-defined players ----------------------------------------
  for (const op of overrides.players ?? []) {
    const p = parseName([op.givenName ?? "", op.surname, op.suffix ?? ""].filter(Boolean).join(" "));
    const id = newIdentity(op.club, p, "override");
    id.source = "override";
    id.overrideId = op.id;
    id.displayNameOverride = op.displayName;
    id.note = op.note ?? null;
    byOverrideId.set(op.id, id);
  }

  // ---- 1. Alias rules: mark tokens they cover; resolved after identities exist
  const aliasRules = (overrides.aliases ?? []).map((a) => ({ ...a, name: a.name.trim().replace(/\s+/g, " ").toLowerCase() }));
  const aliasFor = (t: Token): OverrideAlias | undefined =>
    aliasRules.find(
      (a) =>
        a.club === t.clubId &&
        a.name === t.raw.trim().replace(/\s+/g, " ").toLowerCase() &&
        (!a.years || (t.year >= a.years[0] && t.year <= a.years[1])),
    );
  const aliased = parsedTokens.filter(({ t }) => aliasFor(t));
  const unaliased = parsedTokens.filter(({ t }) => !aliasFor(t));

  // ---- 2. Exact full names -------------------------------------------------
  const fullName = unaliased.filter(({ p }) => p.given !== null);
  for (const { t, p } of fullName) {
    const id = newIdentity(t.clubId, p);
    assign(t, p, id, "exact_full_name", "high");
  }

  // ---- 3. Suffix merge -------------------------------------------------------
  for (const id of [...identities.values()]) {
    if (id.suffix !== null || id.givenCanon === null) continue;
    const suffixed = [...identities.values()].filter(
      (o) => o !== id && o.clubId === id.clubId && o.surnameKey === id.surnameKey && o.givenCanon === id.givenCanon && o.suffix !== null,
    );
    if (suffixed.length === 1) {
      const target = suffixed[0];
      for (const a of assignments.values()) {
        if (a.identity === id) {
          a.identity = target;
          a.method = "suffix_merge";
          a.confidence = "medium";
          a.candidates = [id, target];
            }
      }
      for (const [k, v] of id.givenSpellings) target.givenSpellings.set(k, (target.givenSpellings.get(k) ?? 0) + v);
      for (const [k, v] of id.surnameSpellings) target.surnameSpellings.set(k, (target.surnameSpellings.get(k) ?? 0) + v);
      target.years.push(...id.years);
      target.tokenCount += id.tokenCount;
      identities.delete(id.key);
    } else if (suffixed.length > 1) {
      id.needsReview = true;
      id.reviewNote = `Written without a suffix, but ${suffixed.map((s) => displayNameFor(s)).join(" and ")} are both on the roster. Pin each year with an alias rule.`;
    }
  }

  // Given-name spellings are complete now (later steps only add initials and
  // surnames), so slugs can be fixed here and referenced by alias rules.
  for (const id of identities.values()) finalizeSlug(id);

  // ---- 4. Resolve alias-rule tokens ---------------------------------------
  // Two passes: rules that point at a full-name or override player resolve
  // now (so their years inform the proximity steps below); rules that point
  // at an initial-only or surname-only player resolve after those exist.
  const pendingAlias: { t: Token; p: ParsedName; rule: OverrideAlias }[] = [];
  const applyAlias = (t: Token, p: ParsedName, rule: OverrideAlias, final: boolean) => {
    const id = byOverrideId.get(rule.player) ?? used.get(rule.player);
    if (id) {
      assign(t, p, id, "override", "high");
      return;
    }
    if (!final) {
      pendingAlias.push({ t, p, rule });
      return;
    }
    const near = [...used.keys()]
      .filter((s) => s.startsWith(rule.club) && s.includes(p.surnameKey))
      .slice(0, 5);
    throw new Error(
      `players.yaml alias "${rule.name}" (${rule.club}) points at unknown player id "${rule.player}".` +
        (near.length ? ` Did you mean: ${near.join(", ")}?` : " Define it under players: first."),
    );
  };
  for (const { t, p } of aliased) applyAlias(t, p, aliasFor(t)!, false);

  // ---- 5. Initial + surname ----------------------------------------------------
  const byYear = (a: { t: Token }, b: { t: Token }) => a.t.year - b.t.year;
  const initialTokens = unaliased.filter(({ p }) => p.given === null && p.initials !== null).sort(byYear);
  for (const { t, p } of initialTokens) {
    const initial = p.initials!.toLowerCase();
    let cands = [...identities.values()].filter(
      (i) =>
        i.clubId === t.clubId &&
        i.surnameKey === p.surnameKey &&
        ((i.givenCanon !== null && i.givenCanon[0] === initial) || (i.givenCanon === null && i.initials?.toLowerCase() === initial)),
    );
    if (p.suffix && cands.some((c) => c.suffix === p.suffix)) cands = cands.filter((c) => c.suffix === p.suffix);
    if (cands.length === 0) {
      const id = newIdentity(t.clubId, p);
      finalizeSlug(id);
      assign(t, p, id, "new_identity", "high");
      continue;
    }
    const { chosen, confidence } = pick(cands, t.year);
    assign(t, p, chosen, cands.length === 1 ? "initial_single" : "initial_by_year", confidence, cands);
  }

  // ---- 6. Surname only -----------------------------------------------------------
  const surnameTokens = unaliased.filter(({ p }) => p.given === null && p.initials === null).sort(byYear);
  for (const { t, p } of surnameTokens) {
    let cands = [...identities.values()].filter((i) => i.clubId === t.clubId && i.surnameKey === p.surnameKey);
    if (p.suffix && cands.some((c) => c.suffix === p.suffix)) cands = cands.filter((c) => c.suffix === p.suffix);
    if (cands.length === 0) {
      const id = newIdentity(t.clubId, p);
      finalizeSlug(id);
      assign(t, p, id, "new_identity", "high");
      continue;
    }
    const { chosen, confidence } = pick(cands, t.year);
    assign(t, p, chosen, cands.length === 1 ? "surname_single" : "surname_by_year", confidence, cands);
  }

  // ---- 7. Alias rules whose target only exists now ---------------------------
  for (const { t, p, rule } of pendingAlias) applyAlias(t, p, rule, true);

  // ---- 8. People (same human at two clubs) -------------------------------------------
  for (const person of overrides.people ?? []) {
    const pid = slugify(person.name);
    for (const playerId of person.players) {
      const id = used.get(playerId);
      if (!id) {
        warnings.push(`people: "${person.name}" lists unknown player id ${playerId}.`);
        continue;
      }
      id.personId = pid;
    }
  }

  // Drop override-defined identities that ended up with no tokens (typo in the override).
  for (const id of [...identities.values()]) {
    finalizeSlug(id);
    if (id.tokenCount === 0) {
      warnings.push(`players.yaml defines ${id.overrideId} but no scoresheet token resolved to it.`);
      identities.delete(id.key);
    }
  }

  return { identities: [...identities.values()], assignments, warnings };
}

export function provisionalSlug(id: Identity): string {
  const given = mostCommon(id.givenSpellings) ?? id.initials ?? "";
  const surname = mostCommon(id.surnameSpellings) ?? id.surnameKey;
  return [id.clubId, slugify(given), slugify(surname), id.suffix ? id.suffix.toLowerCase() : ""].filter(Boolean).join("-");
}
