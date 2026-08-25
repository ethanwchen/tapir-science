/**
 * Daniels' VDOT model.
 *
 * VDOT is a single number describing aerobic running fitness. Its usefulness
 * is that it converts cleanly in both directions: give it a race result and
 * it tells you what you can run at any other distance, and what paces you
 * should be training at.
 *
 * The two curves below come from Daniels & Gilbert. The first is the oxygen
 * cost of running at a given velocity; the second is the fraction of maximum
 * oxygen uptake a runner can hold for a given duration. VDOT is the first
 * divided by the second.
 */

/** Daniels' five training intensities. */
export type PaceKey = 'E' | 'M' | 'T' | 'I' | 'R';

export const PACE_KEYS: readonly PaceKey[] = ['E', 'M', 'T', 'I', 'R'];

export const PACE_NAMES: Record<PaceKey, string> = {
  E: 'Easy',
  M: 'Marathon',
  T: 'Threshold',
  I: 'Interval',
  R: 'Repetition',
};

/** Oxygen cost of running at `v` metres per minute, in ml/kg/min. */
export function vo2AtVelocity(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

/** Inverse of {@link vo2AtVelocity}: the velocity that costs `vo2`. */
export function velocityAtVo2(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/**
 * Fraction of VO2max sustainable for `minutes` of racing.
 *
 * Close to 1.0 around six minutes, decaying toward 0.8 over three hours.
 */
export function percentMaxForDuration(minutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * minutes) +
    0.2989558 * Math.exp(-0.1932605 * minutes)
  );
}

/**
 * VDOT implied by covering `distanceM` metres in `durationS` seconds.
 *
 * ```ts
 * vdotFromPerformance(10_000, 41 * 60 + 21) // => ~50
 * ```
 */
export function vdotFromPerformance(distanceM: number, durationS: number): number {
  if (distanceM <= 0 || durationS <= 0) {
    throw new RangeError('Distance and duration must both be positive');
  }
  const minutes = durationS / 60;
  return vo2AtVelocity(distanceM / minutes) / percentMaxForDuration(minutes);
}

/**
 * Predicted race time in seconds for `distanceM` at a given VDOT.
 *
 * The relationship is implicit in duration -- how long you are racing
 * determines what fraction of maximum you can hold -- so it is solved
 * numerically by bisection.
 *
 * ```ts
 * predictTime(50, 5000) // => 1197, i.e. 19:57
 * ```
 */
export function predictTime(vdot: number, distanceM: number): number {
  if (vdot <= 0) throw new RangeError('VDOT must be positive');
  if (distanceM <= 0) throw new RangeError('Distance must be positive');

  let lo = 1;
  let hi = 8 * 3600;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    // Implied VDOT falls as the time rises, so the function is monotone.
    if (vdotFromPerformance(distanceM, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The equivalent performance at another distance.
 *
 * ```ts
 * // What should a 19:57 5K runner expect over the marathon?
 * equivalentTime(5000, 1197, 42_195) // => ~11449, i.e. 3:10:49
 * ```
 */
export function equivalentTime(fromDistanceM: number, fromDurationS: number, toDistanceM: number): number {
  return predictTime(vdotFromPerformance(fromDistanceM, fromDurationS), toDistanceM);
}

/**
 * Fraction of VDOT each training intensity is run at.
 *
 * Calibrated against Daniels' published tables: at VDOT 50 these reproduce
 * E 5:14/km, M 4:28/km, T 4:15/km, I 3:54/km, R 3:38/km.
 */
const PACE_FRACTION: Record<PaceKey, number> = {
  E: 0.68,
  M: 0.83,
  T: 0.88,
  I: 0.98,
  R: 1.07,
};

/**
 * Band multipliers, `[fastest, slowest]`, applied to the target pace.
 *
 * Easy running is a range on purpose, and the range is one-sided: it opens
 * downward only. The mistake easy runs actually make is drifting *faster*
 * toward threshold, so a band whose quick end sits ahead of easy pace would
 * license the very thing it exists to prevent. At VDOT 50 this gives
 * 5:14-5:45/km, matching Daniels' published E range.
 *
 * The hard intensities are targets rather than ranges, so they get a couple
 * of seconds either side and no more.
 */
const PACE_BAND: Record<PaceKey, [number, number]> = {
  E: [1, 1.1],
  M: [0.99, 1.02],
  T: [0.99, 1.02],
  I: [0.99, 1.02],
  R: [0.99, 1.02],
};

/** Seconds per kilometre for one training intensity. */
export function paceSecPerKm(vdot: number, key: PaceKey): number {
  return (1000 / velocityAtVo2(vdot * PACE_FRACTION[key])) * 60;
}

/** Seconds per mile for one training intensity. */
export function paceSecPerMile(vdot: number, key: PaceKey): number {
  return paceSecPerKm(vdot, key) * 1.609344;
}

/** Prescribed band, `[fastest, slowest]` seconds per kilometre. */
export function paceRange(vdot: number, key: PaceKey): [number, number] {
  const mid = paceSecPerKm(vdot, key);
  const [fast, slow] = PACE_BAND[key];
  return [Math.round(mid * fast), Math.round(mid * slow)];
}

/** Every training pace at once. */
export function trainingPaces(vdot: number): Record<PaceKey, [number, number]> {
  return {
    E: paceRange(vdot, 'E'),
    M: paceRange(vdot, 'M'),
    T: paceRange(vdot, 'T'),
    I: paceRange(vdot, 'I'),
    R: paceRange(vdot, 'R'),
  };
}

/** Common race distances in metres. */
export const RACE_DISTANCES = {
  '1500m': 1500,
  mile: 1609.344,
  '3000m': 3000,
  '5k': 5000,
  '10k': 10_000,
  '15k': 15_000,
  '10mile': 16_093.44,
  half: 21_097.5,
  '30k': 30_000,
  marathon: 42_195,
} as const;

export type RaceName = keyof typeof RACE_DISTANCES;

/** Predicted time at every common distance, in seconds. */
export function racePredictions(vdot: number): Record<RaceName, number> {
  const out = {} as Record<RaceName, number>;
  for (const name of Object.keys(RACE_DISTANCES) as RaceName[]) {
    out[name] = predictTime(vdot, RACE_DISTANCES[name]);
  }
  return out;
}

/**
 * VDOT from a 20-minute time trial, given the distance covered.
 *
 * The most practical field test there is: threshold velocity is about 93% of
 * 20-minute time-trial velocity, and threshold sits at 88% of VDOT.
 */
export function vdotFrom20MinTt(distanceM: number): number {
  if (distanceM <= 0) throw new RangeError('Distance must be positive');
  return vo2AtVelocity((distanceM / 20) * 0.93) / 0.88;
}
