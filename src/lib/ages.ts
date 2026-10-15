/**
 * Age bands. A player's age in a season is the season year minus his birth
 * year (see rosterAges in data.ts); the band is where that age falls. When
 * only a band is known (a captain said "he's 50+"), it is stored with the
 * year it was true in, and bandInYear() shifts it to another season: a 50+
 * in 2026 was at least 37 in 2013, so he is "40-49 or older" there.
 */
export interface AgeBand {
  id: string;
  label: string;
  min: number;
  /** Inclusive; Infinity for the open top band. */
  max: number;
}

export const AGE_BANDS: AgeBand[] = [
  { id: "u25", label: "Under 25", min: 0, max: 24 },
  { id: "25-29", label: "25–29", min: 25, max: 29 },
  { id: "30-39", label: "30–39", min: 30, max: 39 },
  { id: "40-49", label: "40–49", min: 40, max: 49 },
  { id: "50+", label: "50+", min: 50, max: Infinity },
];

export const bandById = new Map(AGE_BANDS.map((b) => [b.id, b]));

export function bandForAge(age: number): AgeBand {
  return AGE_BANDS.find((b) => age >= b.min && age <= b.max) ?? AGE_BANDS[AGE_BANDS.length - 1];
}

/** Accepts "50+", "30-39", "u25", "under 25" (any case, en or hyphen dash). */
export function parseBand(text: string): AgeBand | null {
  const t = text.trim().toLowerCase().replace(/–/g, "-").replace(/\s+/g, " ");
  if (t === "under 25" || t === "<25") return bandById.get("u25")!;
  return bandById.get(t) ?? null;
}

export interface BandEstimate {
  /** Lowest band the player could be in that year. */
  band: AgeBand;
  /** True when the stored band is open-ended or the shift spans more than one band, so "or older". */
  orOlder: boolean;
  /** Minimum age in that year. */
  minAge: number;
}

/**
 * The band a player with only a stored band is in during `year`. A band
 * stored for `bandYear` gives an age range [min, max] then; shifting by
 * (year - bandYear) gives the range in `year`. Returns null when the shift
 * would put the minimum age below zero.
 */
export function bandInYear(stored: AgeBand, bandYear: number, year: number): BandEstimate | null {
  const shift = year - bandYear;
  const minAge = stored.min + shift;
  const maxAge = stored.max + shift;
  if (minAge < 0) return null;
  const low = bandForAge(Math.max(minAge, 0));
  const high = bandForAge(Math.min(maxAge, 200));
  return { band: low, orOlder: low.id !== high.id, minAge };
}
