/**
 * Carbohydrate and fluid guidance.
 *
 * Figures follow current sports-nutrition consensus, expressed as grams of
 * carbohydrate per kilogram of bodyweight per day and periodised to the
 * session. Eating the same every day regardless of load is the mistake most
 * amateurs make, and it is the one thing this module exists to fix.
 *
 * Deliberately absent: calorie counting, weight-loss targeting, BMI, and
 * deficit recommendations. A library that tells endurance athletes to eat
 * less is a library that hurts people. This is guidance, not medical or
 * dietary advice.
 */

export type DayType =
  | 'rest'
  | 'easy_short'
  | 'quality'
  | 'long_moderate'
  | 'long_big'
  | 'race_week';

export interface SessionShape {
  durationS: number;
  /** True for threshold, intervals, hills, or a race-pace effort. */
  quality?: boolean;
}

export interface FuelTargets {
  dayType: DayType;
  /** Grams per kilogram per day, [low, high]. */
  dailyCarbsPerKg: [number, number];
  /** Absolute grams for this athlete, when bodyweight is known. */
  dailyCarbsG?: [number, number];
  /** Carbohydrate before the session, grams. */
  preSessionG?: number;
  /** How far ahead to eat it, hours. */
  preSessionHoursBefore?: [number, number];
  /** Carbohydrate during the session, grams per hour. */
  duringGPerHour?: [number, number];
}

const TABLE: Record<DayType, Omit<FuelTargets, 'dayType' | 'dailyCarbsG' | 'preSessionG'>> = {
  rest: { dailyCarbsPerKg: [3, 5] },
  easy_short: { dailyCarbsPerKg: [5, 7] },
  quality: {
    dailyCarbsPerKg: [6, 8],
    preSessionHoursBefore: [2, 3],
    duringGPerHour: [0, 30],
  },
  long_moderate: {
    dailyCarbsPerKg: [7, 10],
    preSessionHoursBefore: [1, 4],
    duringGPerHour: [30, 60],
  },
  long_big: {
    dailyCarbsPerKg: [8, 10],
    preSessionHoursBefore: [3, 4],
    duringGPerHour: [60, 90],
  },
  race_week: {
    dailyCarbsPerKg: [8, 12],
    preSessionHoursBefore: [3, 3],
    duringGPerHour: [60, 90],
  },
};

/** Pre-session carbohydrate as grams per kilogram, by day type. */
const PRE_SESSION_PER_KG: Partial<Record<DayType, number>> = {
  quality: 1,
  long_moderate: 1.5,
  long_big: 2.5,
  race_week: 2.5,
};

export function classifyDay(sessions: SessionShape[], opts: { raceWeek?: boolean } = {}): DayType {
  if (opts.raceWeek) return 'race_week';
  if (sessions.length === 0) return 'rest';
  const totalS = sessions.reduce((s, x) => s + x.durationS, 0);
  if (totalS > 150 * 60) return 'long_big';
  if (totalS >= 90 * 60) return 'long_moderate';
  if (sessions.some((s) => s.quality)) return 'quality';
  return 'easy_short';
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Carbohydrate targets for a day's training.
 *
 * ```ts
 * fuelTargets([{ durationS: 170 * 60 }], 70);
 * // { dayType: 'long_big', dailyCarbsG: [560, 700],
 * //   preSessionG: 175, duringGPerHour: [60, 90], ... }
 * ```
 *
 * Bodyweight is optional; without it you get the per-kilogram figures only.
 */
export function fuelTargets(
  sessions: SessionShape[],
  weightKg?: number,
  opts: { raceWeek?: boolean } = {},
): FuelTargets {
  const dayType = classifyDay(sessions, opts);
  const targets: FuelTargets = { dayType, ...TABLE[dayType] };

  if (weightKg && weightKg > 0) {
    targets.dailyCarbsG = [
      round5(targets.dailyCarbsPerKg[0] * weightKg),
      round5(targets.dailyCarbsPerKg[1] * weightKg),
    ];
    const perKg = PRE_SESSION_PER_KG[dayType];
    if (perKg !== undefined) targets.preSessionG = round5(perKg * weightKg);
  }

  return targets;
}

/**
 * Grams of carbohydrate to carry for a session of a given length.
 *
 * Anything above about 60g/h needs a glucose-to-fructose blend near 2:1,
 * because glucose transport saturates around there. Above 90g/h needs
 * deliberate gut training and is not a thing to try for the first time on
 * race day.
 */
export function carbsToCarry(durationS: number): { grams: number; note: string } | null {
  const hours = durationS / 3600;
  if (hours < 1.25) return null;
  if (hours <= 2.5) {
    return { grams: round5(45 * hours), note: 'Any single-source carbohydrate is fine at this rate.' };
  }
  return {
    grams: round5(75 * hours),
    note: 'Above 60g per hour, use a 2:1 glucose-to-fructose blend and practise it in training first.',
  };
}

/**
 * Fluid guidance. Deliberately conservative, and deliberately anchored on
 * thirst: overdrinking during endurance events is the more dangerous error.
 */
export function fluidGuidance(durationS: number, forecastC = 15): string | null {
  if (durationS < 60 * 60) return null;
  const hot = forecastC >= 22;
  const perHour = hot ? '500-800ml' : '400-600ml';
  const sodium = durationS > 120 * 60 || hot ? ' with 300-600mg of sodium per litre' : '';
  return `Drink to thirst, roughly ${perHour} per hour${sodium}.`;
}
