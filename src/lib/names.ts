/**
 * Name parsing and identity resolution for scoresheet tokens.
 *
 * Pure functions, no I/O. Used by scripts/import.ts and reusable by the app
 * (search, "did you mean") later.
 */

export type Suffix = "Jr" | "Sr" | "II" | "III" | "IV";

export interface ParsedName {
  raw: string;
  /** Given name as written when it is a real name ("Jon", "JM"); null for a bare initial or surname-only. */
  given: string | null;
  /** Nickname-folded, lowercased given name used for identity: "john" for Jon/Jonathan/John. */
  givenCanon: string | null;
  /** Uppercase initials when the given part was initials ("J", "JM"); also set for multi-letter given names like "JJ". */
  initials: string | null;
  surname: string;
  /** Lowercased, punctuation-stripped surname used for identity: "omara". */
  surnameKey: string;
  suffix: Suffix | null;
}

const NICKNAME_GROUPS: string[][] = [
  ["thomas", "tom", "tommy"],
  ["patrick", "pat", "paddy"],
  ["michael", "mike", "mikey"],
  ["matthew", "matt"],
  ["robert", "rob", "bob", "bobby", "robbie", "robby"],
  ["david", "dave", "davey"],
  ["james", "jim", "jimmy", "jamie", "jas"],
  ["john", "jon", "jonathan", "jonathon", "johnny"],
  ["scott", "scotty"],
  ["malcolm", "malcom"],
  ["aidan", "aiden"],
  ["daniel", "dan", "danny"],
  ["stephen", "steven", "steve"],
  ["gregory", "greg"],
  ["benjamin", "ben", "benny"],
  ["charles", "chuck", "charlie", "chas"],
  ["jeffrey", "jeff"],
  ["kenneth", "ken", "kenny"],
  ["andrew", "andy", "drew"],
  ["william", "will", "bill", "billy", "willie"],
  ["nathan", "nate", "nathaniel"],
  ["richard", "rich", "rick", "richie"],
  ["joseph", "joe", "joey"],
  ["nicholas", "nick"],
  ["sean", "shawn", "shaun"],
  ["timothy", "tim"],
  ["edward", "ed", "eddie", "ted"],
  ["anthony", "tony"],
  ["christopher", "chris"],
  ["samuel", "sam"],
  ["frederick", "fred"],
  ["peter", "pete"],
  ["lawrence", "larry"],
  ["ronald", "ron", "ronnie"],
  ["donald", "don"],
  ["douglas", "doug"],
  ["gerald", "gerry", "jerry"],
  ["gordon", "gordy"],
  ["derek", "derrick"],
  ["mark", "marc"],
  ["corey", "cory", "kory"],
  ["bryce", "brice"],
  ["walter", "walt"],
  ["martin", "marty"],
  ["spencer", "spence"],
  ["theodore", "ted", "teddy"],
  ["harold", "hal", "harry"],
  ["albert", "al"],
];

const NICKNAME_CANON = new Map<string, string>();
for (const group of NICKNAME_GROUPS) for (const n of group) NICKNAME_CANON.set(n, group[0]);

const SUFFIX_RE = /^(.*?)[\s,]+(jr|sr|ii|iii|iv)\.?$/i;
const INITIALS_RE = /^(?:[A-Z]\.?){1,3}$/;

export function normalizeSuffix(s: string): Suffix {
  const u = s.toUpperCase();
  if (u === "JR") return "Jr";
  if (u === "SR") return "Sr";
  return u as Suffix; // II, III, IV
}

export function surnameKey(surname: string): string {
  return surname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function givenCanon(given: string): string {
  const k = given.toLowerCase().replace(/[^a-z]/g, "");
  return NICKNAME_CANON.get(k) ?? k;
}

export function parseName(rawIn: string): ParsedName {
  const raw = rawIn.trim().replace(/\s+/g, " ");
  let rest = raw;
  let suffix: Suffix | null = null;
  const m = SUFFIX_RE.exec(rest);
  if (m) {
    rest = m[1].trim();
    suffix = normalizeSuffix(m[2]);
  }
  const tokens = rest.split(" ").filter(Boolean);
  if (tokens.length === 1) {
    return { raw, given: null, givenCanon: null, initials: null, surname: tokens[0], surnameKey: surnameKey(tokens[0]), suffix };
  }
  const surname = tokens[tokens.length - 1];
  const givenRaw = tokens.slice(0, -1).join(" ");
  if (INITIALS_RE.test(givenRaw)) {
    const letters = givenRaw.replace(/\./g, "").toUpperCase();
    if (letters.length === 1) {
      return { raw, given: null, givenCanon: null, initials: letters, surname, surnameKey: surnameKey(surname), suffix };
    }
    // "JM", "DJ", "JJ": treat as a given name for identity, and as initials for matching "J. X".
    return { raw, given: letters, givenCanon: letters.toLowerCase(), initials: letters, surname, surnameKey: surnameKey(surname), suffix };
  }
  return {
    raw,
    given: givenRaw,
    givenCanon: givenCanon(givenRaw),
    initials: givenRaw[0].toUpperCase(),
    surname,
    surnameKey: surnameKey(surname),
    suffix,
  };
}

/** Split a Player(s) cell into individual name tokens, preserving order. */
export function splitPlayers(cell: string): string[] {
  return cell
    .split(/\s*\/\s*|\s+&\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function suffixDisplay(s: Suffix | null): string {
  if (!s) return "";
  return s === "Jr" || s === "Sr" ? `${s}.` : s;
}

/** Levenshtein distance, used only for "did you mean" hints in the resolution report. */
export function editDistance(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}
