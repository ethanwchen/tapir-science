/**
 * The two-parameter critical-speed model.
 *
 * Over the range where it applies -- roughly two to forty minutes -- distance
 * covered is very nearly linear in time:
 *
 *     d = CS * t + D'
 *
 * CS is the asymptotic sustainable velocity, close to lactate threshold. D'
 * is the finite work capacity available above it, in metres. Fitting the line
 * to a handful of hard efforts recovers both.
 *
 * It is a useful second opinion on VDOT, because it is derived from the
 * *shape* of somebody's speed-over-distance curve rather than from any single
 * result.
 */

import { vo2AtVelocity } from './vdot.js';

export interface Effort {
  distanceM: number;
  durationS: number;
}

export interface CriticalSpeedFit {
  /** Metres per second. */
  cs: number;
  /** Metres available above critical speed, the "anaerobic reserve". */
  dPrime: number;
  /** Coefficient of determination. Below ~0.95, be suspicious of the fit. */
  r2: number;
  pointsUsed: number;
}

/** Outside this window the linear model does not hold. */
const MIN_DURATION_S = 120;
const MAX_DURATION_S = 40 * 60;

/**
 * Keep only the fastest effort at each rough duration.
 *
 * Without this, a pile of easy runs at similar durations drags the fit down
 * and the model reports a critical speed nobody would recognise.
 */
export function bestPerDuration(efforts: Effort[], bucketSeconds = 120): Effort[] {
  const buckets = new Map<number, Effort>();
  for (const e of efforts) {
    if (e.durationS <= 0 || e.distanceM <= 0) continue;
    const key = Math.round(e.durationS / bucketSeconds);
    const best = buckets.get(key);
    if (!best || e.distanceM / e.durationS > best.distanceM / best.durationS) buckets.set(key, e);
  }
  return [...buckets.values()].sort((a, b) => a.durationS - b.durationS);
}

/**
 * Fit critical speed to a set of efforts. Returns null when there is not
 * enough usable data -- three distinct durations is the minimum, and it is
 * a minimum rather than a recommendation.
 */
export function fitCriticalSpeed(efforts: Effort[]): CriticalSpeedFit | null {
  const usable = bestPerDuration(
    efforts.filter((e) => e.durationS >= MIN_DURATION_S && e.durationS <= MAX_DURATION_S),
  );
  if (usable.length < 3) return null;

  const n = usable.length;
  const sumT = usable.reduce((s, e) => s + e.durationS, 0);
  const sumD = usable.reduce((s, e) => s + e.distanceM, 0);
  const sumTT = usable.reduce((s, e) => s + e.durationS * e.durationS, 0);
  const sumTD = usable.reduce((s, e) => s + e.durationS * e.distanceM, 0);

  const denominator = n * sumTT - sumT * sumT;
  if (denominator === 0) return null;

  const cs = (n * sumTD - sumT * sumD) / denominator;
  const dPrime = (sumD - cs * sumT) / n;
  if (!Number.isFinite(cs) || cs <= 0) return null;

  const meanD = sumD / n;
  const ssTot = usable.reduce((s, e) => s + Math.pow(e.distanceM - meanD, 2), 0);
  const ssRes = usable.reduce((s, e) => s + Math.pow(e.distanceM - (cs * e.durationS + dPrime), 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { cs, dPrime, r2, pointsUsed: n };
}

/**
 * VDOT implied by a critical speed, treating CS as threshold velocity.
 *
 * Lets a critical-speed fit be compared directly against a VDOT read from
 * race results. Large disagreement usually means one of the two inputs is
 * not what it appears to be.
 */
export function vdotFromCriticalSpeed(csMetresPerSecond: number): number {
  return vo2AtVelocity(csMetresPerSecond * 60) / 0.88;
}

/**
 * Predicted time for a distance, from the model itself rather than via VDOT.
 * Only trustworthy inside the two-to-forty-minute window.
 */
export function predictFromCriticalSpeed(fit: CriticalSpeedFit, distanceM: number): number {
  if (distanceM <= fit.dPrime) throw new RangeError('Distance is inside the anaerobic reserve');
  return (distanceM - fit.dPrime) / fit.cs;
}
