/**
 * Heart-rate zones, anchored on lactate threshold heart rate.
 *
 * Friel's LTHR zones are used in preference to max-HR percentages for a
 * practical reason: LTHR is measurable in a 20-minute time trial, whereas
 * true max HR is not measurable without an all-out effort that most runners
 * should not be asked to perform.
 */

import type { PaceKey } from './vdot.js';

export type HrZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';

export const HR_ZONES: readonly HrZone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];

/** Lower bound of each zone, as a fraction of LTHR. */
const ZONE_FLOOR: Record<HrZone, number> = {
  Z1: 0,
  Z2: 0.81,
  Z3: 0.9,
  Z4: 0.94,
  Z5: 1.0,
};

export const ZONE_NAMES: Record<HrZone, string> = {
  Z1: 'Recovery',
  Z2: 'Easy',
  Z3: 'Steady',
  Z4: 'Threshold',
  Z5: 'VO2max',
};

export interface ZoneBand {
  zone: HrZone;
  name: string;
  minBpm: number;
  maxBpm: number;
}

/**
 * Max HR from age using Tanaka's `208 - 0.7 x age`, which fits adult
 * populations considerably better than the folkloric `220 - age`.
 */
export function estimateMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age);
}

/** LTHR is roughly 90% of max HR in trained runners. */
export function estimateLthr(maxHr: number): number {
  return Math.round(maxHr * 0.9);
}

/** The five bands, contiguous and ascending. */
export function hrZones(lthr: number): ZoneBand[] {
  return HR_ZONES.map((zone, i) => {
    const next = HR_ZONES[i + 1];
    return {
      zone,
      name: ZONE_NAMES[zone],
      minBpm: Math.round(lthr * ZONE_FLOOR[zone]) || Math.round(lthr * 0.6),
      maxBpm: next ? Math.round(lthr * ZONE_FLOOR[next]) - 1 : Math.round(lthr * 1.12),
    };
  });
}

/** Which zone a given heart rate falls in. */
export function zoneOfHr(lthr: number, bpm: number): HrZone {
  const ratio = bpm / lthr;
  if (ratio >= ZONE_FLOOR.Z5) return 'Z5';
  if (ratio >= ZONE_FLOOR.Z4) return 'Z4';
  if (ratio >= ZONE_FLOOR.Z3) return 'Z3';
  if (ratio >= ZONE_FLOOR.Z2) return 'Z2';
  return 'Z1';
}

/** The heart-rate zone a Daniels training intensity should land in. */
export const ZONE_FOR_PACE: Record<PaceKey, HrZone> = {
  E: 'Z2',
  M: 'Z3',
  T: 'Z4',
  I: 'Z5',
  R: 'Z5',
};

/**
 * Effort descriptions for runners with no heart-rate monitor.
 *
 * Not a consolation prize: the talk test is a genuinely reliable way to hold
 * an intensity, and plenty of good runners never wear a strap.
 */
export const RPE_GUIDANCE: Record<PaceKey, string> = {
  E: 'Full sentences, nose breathing possible. RPE 3-4.',
  M: 'Short sentences. Comfortably hard. RPE 5-6.',
  T: 'A few words at a time. Sustainable for an hour if you had to. RPE 7-8.',
  I: 'Single words. Hard, but repeatable. RPE 9.',
  R: 'Fast and smooth, not a sprint. Full recovery between. RPE 9.',
};
