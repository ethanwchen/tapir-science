/**
 * Formatting and parsing for paces and durations.
 *
 * Small, but the difference between a library you can use and one you write
 * a wrapper around.
 */

/** Seconds per kilometre (or mile) as `m:ss`. */
export function formatPace(secondsPerUnit: number): string {
  const total = Math.round(secondsPerUnit);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Seconds as `h:mm:ss`, or `m:ss` when under an hour. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Parse `m:ss`, `h:mm:ss`, or a bare number of seconds.
 *
 * ```ts
 * parseDuration('3:10:49') // => 11449
 * parseDuration('19:57')   // => 1197
 * ```
 */
export function parseDuration(input: string): number {
  const parts = input.trim().split(':').map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) throw new RangeError(`Cannot parse duration: ${input}`);
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  throw new RangeError(`Cannot parse duration: ${input}`);
}

/** A pace band as `4:15-4:30`. */
export function formatRange([fast, slow]: [number, number]): string {
  return `${formatPace(fast)}-${formatPace(slow)}`;
}
