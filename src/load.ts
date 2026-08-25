/**
 * Training load and the acute:chronic workload ratio.
 *
 * Load here is rTSS: an hour at threshold pace scores 100, and cost scales
 * with the square of intensity, so a hard hour is worth far more than an
 * easy one. The ACWR compares what you have done this week against what you
 * are conditioned for, and is the most widely replicated injury-risk signal
 * in endurance sport.
 */

import { paceSecPerKm } from './vdot.js';

/** Below this, you are detraining rather than resting. */
export const ACWR_SAFE_MIN = 0.8;
/** Above this, injury incidence begins to climb. */
export const ACWR_SAFE_MAX = 1.3;
/** Above this, it climbs sharply. */
export const ACWR_DANGER = 1.5;

/**
 * Intensity factor is capped here so a single short, very fast effort cannot
 * dominate a week's load.
 */
const MAX_INTENSITY_FACTOR = 1.15;

/**
 * rTSS for a run, from pace.
 *
 * ```ts
 * runLoad(14_100, 3600, 50) // an hour at threshold for a VDOT 50 runner => 100
 * ```
 */
export function runLoad(distanceM: number, durationS: number, vdot: number): number {
  if (distanceM <= 0 || durationS <= 0) return 0;
  const thresholdSecPerKm = paceSecPerKm(vdot, 'T');
  const actualSecPerKm = durationS / (distanceM / 1000);
  const intensityFactor = Math.min(thresholdSecPerKm / actualSecPerKm, MAX_INTENSITY_FACTOR);
  return (durationS * intensityFactor * intensityFactor) / 36;
}

/**
 * Load from heart rate instead of pace.
 *
 * Use this for trail, hills, heat, or a treadmill, where pace understates the
 * work being done. Needs the athlete's lactate threshold heart rate.
 */
export function hrLoad(durationS: number, avgHr: number, lthr: number): number {
  if (durationS <= 0 || avgHr <= 0 || lthr <= 0) return 0;
  const intensityFactor = Math.min(avgHr / lthr, MAX_INTENSITY_FACTOR);
  return (durationS * intensityFactor * intensityFactor) / 36;
}

export interface WorkloadRatio {
  /** Mean daily load over the last 7 days. */
  acute: number;
  /** Mean daily load over the last 28 days. */
  chronic: number;
  ratio: number;
}

/**
 * Acute and chronic load from a chronological series of daily loads, most
 * recent last. Days off are zeroes and must be present -- the ratio is
 * meaningless if rest days are omitted.
 *
 * Both figures are mean daily load, so the ratio is dimensionless and
 * comparable between a 30km-a-week runner and a 130km-a-week runner.
 */
export function workloadRatio(dailyLoads: number[]): WorkloadRatio {
  const acuteWindow = dailyLoads.slice(-7);
  const chronicWindow = dailyLoads.slice(-28);
  const acute = acuteWindow.reduce((a, b) => a + b, 0) / 7;
  const chronic = chronicWindow.reduce((a, b) => a + b, 0) / 28;
  // An athlete with no history has no ratio to speak of. Reporting 1.0 is
  // honest about that; reporting Infinity would trip every alarm we have.
  return { acute, chronic, ratio: chronic > 0 ? acute / chronic : 1 };
}

/** The ratio at every point in a series, for charting a build. */
export function workloadSeries(dailyLoads: number[]): WorkloadRatio[] {
  return dailyLoads.map((_, i) => workloadRatio(dailyLoads.slice(0, i + 1)));
}

export type WorkloadVerdict = 'detraining' | 'safe' | 'high' | 'danger';

export function workloadVerdict(ratio: number): WorkloadVerdict {
  if (ratio > ACWR_DANGER) return 'danger';
  if (ratio > ACWR_SAFE_MAX) return 'high';
  if (ratio < ACWR_SAFE_MIN) return 'detraining';
  return 'safe';
}

/**
 * The most load a week may carry without pushing the ratio past a ceiling.
 *
 * Useful for answering "how much can I actually do next week?" rather than
 * finding out afterwards.
 */
export function maxSafeWeeklyLoad(dailyLoads: number[], ceiling = ACWR_SAFE_MAX): number {
  const chronicWindow = dailyLoads.slice(-21);
  const chronicSum = chronicWindow.reduce((a, b) => a + b, 0);
  // Solve for next week's total W: (W/7) / ((chronicSum + W)/28) = ceiling
  const denominator = 28 - ceiling * 7;
  if (denominator <= 0) return Number.POSITIVE_INFINITY;
  return (ceiling * 7 * chronicSum) / denominator;
}
