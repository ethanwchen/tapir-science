/**
 * Units.
 *
 * A runner in Boston thinks in miles and a runner in Berlin thinks in
 * kilometres, and neither wants to do arithmetic at 6am. Everything the
 * engine computes is metric; this module is the only place that changes,
 * and it changes at the very edge, on the way to the screen.
 */

export type UnitSystem = 'metric' | 'imperial';

export const METRES_PER_MILE = 1609.344;

/**
 * Countries that run in miles. Deliberately short, and deliberately
 * overridable: plenty of British and Canadian runners think in miles for
 * road races and kilometres for track, and no default gets that right.
 */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

/**
 * A starting guess from the device region, never a decision. The settings
 * toggle is the answer; this just picks which way it opens.
 */
export function defaultUnits(region: string | undefined): UnitSystem {
  if (!region) return 'metric';
  // Accepts a bare region ('US') or a full locale tag ('en-US', 'en-Latn-US'):
  // the region is the last subtag, and there is no useful signal in the rest.
  const parts = region.replace(/_/g, '-').split('-').filter(Boolean);
  const candidate = (parts.length > 1 ? parts[parts.length - 1] : parts[0]) ?? '';
  return IMPERIAL_REGIONS.has(candidate.toUpperCase()) ? 'imperial' : 'metric';
}

/** Metres per display unit. */
export function unitMetres(units: UnitSystem): number {
  return units === 'imperial' ? METRES_PER_MILE : 1000;
}

export function unitLabel(units: UnitSystem, plural = false): string {
  if (units === 'imperial') return plural ? 'miles' : 'mi';
  return 'km';
}

export function toDisplayDistance(metres: number, units: UnitSystem): number {
  return metres / unitMetres(units);
}

export function fromDisplayDistance(value: number, units: UnitSystem): number {
  return value * unitMetres(units);
}

/**
 * Distance for a screen: one decimal under ten, whole numbers above, and
 * no trailing `.0` ever.
 */
export function formatDistance(metres: number, units: UnitSystem): string {
  const value = toDisplayDistance(metres, units);
  const text = value >= 10 ? String(Math.round(value)) : (Math.round(value * 10) / 10).toFixed(1);
  return `${text.replace(/\.0$/, '')} ${unitLabel(units)}`;
}

/** Seconds per kilometre converted to seconds per display unit. */
export function paceInUnits(secPerKm: number, units: UnitSystem): number {
  return units === 'imperial' ? secPerKm * (METRES_PER_MILE / 1000) : secPerKm;
}

function mmss(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatPaceIn(secPerKm: number, units: UnitSystem): string {
  return `${mmss(paceInUnits(secPerKm, units))}/${unitLabel(units)}`;
}

/** A band, `[fast, slow]` in seconds per kilometre. */
export function formatPaceRangeIn(range: [number, number], units: UnitSystem): string {
  const fast = mmss(paceInUnits(range[0], units));
  const slow = mmss(paceInUnits(range[1], units));
  return `${fast}-${slow}/${unitLabel(units)}`;
}

/**
 * How a rep is written on the screen.
 *
 * Race distances keep their names in both systems, a 5K is a 5K in
 * Chicago, but a 1000m rep becomes "1 mile" for a runner who thinks in
 * miles, because that is the lap they will actually run.
 */
export function formatRep(metres: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = metres / METRES_PER_MILE;
    // `Math.round(miles) >= 1`, not `miles >= 1`. The track mile is 1609 m,
    // which is 0.9998 of a statute mile, so the stricter guard rejected the
    // one rep this branch exists for and showed "1609 m" to the runner who
    // thinks in miles. Rounding first keeps the guard's real job, which is
    // stopping a tiny distance being called "0 miles".
    if (Math.abs(miles - Math.round(miles)) < 0.08 && Math.round(miles) >= 1) {
      return `${Math.round(miles)} mile${Math.round(miles) === 1 ? '' : 's'}`;
    }
    if (Math.abs(miles - 0.5) < 0.05) return 'half mile';
    if (Math.abs(miles - 0.25) < 0.03) return 'quarter mile';
    return `${Math.round(metres)} m`;
  }
  if (metres >= 1000 && metres % 1000 === 0) return `${metres / 1000} km`;
  return `${Math.round(metres)} m`;
}

/** Human duration: `45 min`, `1 h 12`, `20 s`. */
export function formatClock(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  if (total < 3600) return `${Math.round(total / 60)} min`;
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
