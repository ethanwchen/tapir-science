import { describe, expect, it } from 'vitest';
import {
  equivalentTime, formatDuration, formatPace, formatRange, paceSecPerKm,
  paceSecPerMile, parseDuration, percentMaxForDuration, PACE_KEYS,
  predictTime, racePredictions, RACE_DISTANCES, trainingPaces,
  vdotFrom20MinTt, vdotFromPerformance, velocityAtVo2, vo2AtVelocity,
} from '../src/index.js';

describe('the underlying curves', () => {
  it('round-trips velocity through oxygen cost', () => {
    for (const v of [160, 200, 250, 300, 400]) {
      expect(velocityAtVo2(vo2AtVelocity(v))).toBeCloseTo(v, 6);
    }
  });

  it('decays sustainable intensity with duration', () => {
    expect(percentMaxForDuration(6)).toBeGreaterThan(0.98);
    expect(percentMaxForDuration(30)).toBeLessThan(percentMaxForDuration(6));
    expect(percentMaxForDuration(180)).toBeGreaterThan(0.78);
    expect(percentMaxForDuration(180)).toBeLessThan(0.83);
  });
});

describe('race prediction against the published tables', () => {
  // Daniels' Running Formula, VDOT 50.
  it.each([
    ['5k', 5000, '19:57'],
    ['10k', 10_000, '41:21'],
    ['half', 21_097.5, '1:31:35'],
    ['marathon', 42_195, '3:10:49'],
  ])('reads %s in %s as VDOT 50', (_name, distance, time) => {
    expect(vdotFromPerformance(distance, parseDuration(time))).toBeCloseTo(50, 0);
  });

  it('predicts those same times back, within a second or two of the table', () => {
    expect(predictTime(50, 5000)).toBeCloseTo(parseDuration('19:57'), -1);
    expect(predictTime(50, 42_195)).toBeCloseTo(parseDuration('3:10:49'), -2);
  });

  it('inverts itself across the whole useful range', () => {
    for (const vdot of [30, 40, 50, 60, 70]) {
      for (const d of Object.values(RACE_DISTANCES)) {
        expect(vdotFromPerformance(d, predictTime(vdot, d))).toBeCloseTo(vdot, 3);
      }
    }
  });

  it('converts a 5K into a marathon', () => {
    // A 19:57 5K runner should be looking at roughly 3:10 for the marathon.
    expect(formatDuration(equivalentTime(5000, parseDuration('19:57'), 42_195))).toMatch(/^3:1[01]:/);
  });

  it('makes longer races slower and fitter runners faster', () => {
    const p = racePredictions(50);
    expect(p['5k']).toBeLessThan(p['10k']);
    expect(p['10k']).toBeLessThan(p.half);
    expect(p.half).toBeLessThan(p.marathon);
    expect(racePredictions(60)['10k']).toBeLessThan(p['10k']);
  });

  it('refuses nonsense instead of returning it', () => {
    expect(() => vdotFromPerformance(0, 100)).toThrow(RangeError);
    expect(() => vdotFromPerformance(100, 0)).toThrow(RangeError);
    expect(() => predictTime(0, 5000)).toThrow(RangeError);
    expect(() => predictTime(50, -1)).toThrow(RangeError);
  });
});

describe('training paces', () => {
  const expected: Record<string, string> = {
    E: '5:14', M: '4:28', T: '4:15', I: '3:54', R: '3:38',
  };

  it.each(Object.entries(expected))('VDOT 50 %s pace is about %s', (key, want) => {
    const got = paceSecPerKm(50, key as 'E');
    expect(Math.abs(got - parseDuration(want))).toBeLessThanOrEqual(4);
  });

  it('orders the intensities correctly', () => {
    const p = trainingPaces(48);
    const order = PACE_KEYS.map((k) => p[k][0]);
    for (let i = 1; i < order.length; i += 1) expect(order[i]!).toBeLessThan(order[i - 1]!);
  });

  it('gives easy running a real band and threshold a tight one', () => {
    const p = trainingPaces(48);
    expect(p.E[1] - p.E[0]).toBeGreaterThan(20);
    expect(p.T[1] - p.T[0]).toBeLessThan(12);
  });

  it('converts to miles', () => {
    expect(paceSecPerMile(50, 'T')).toBeCloseTo(paceSecPerKm(50, 'T') * 1.609344, 6);
  });

  it('makes every intensity faster as fitness rises', () => {
    for (const key of PACE_KEYS) {
      expect(paceSecPerKm(55, key)).toBeLessThan(paceSecPerKm(45, key));
    }
  });
});

describe('the 20-minute field test', () => {
  it('turns distance covered into a VDOT', () => {
    // 5km in 20 minutes is a strong club runner. The test reads slightly
    // below an all-out 5K race of the same time, which is the point: a time
    // trial is run on your own, and nobody empties the tank alone.
    expect(vdotFrom20MinTt(5000)).toBeCloseTo(49.3, 1);
    expect(vdotFrom20MinTt(5000)).toBeLessThan(vdotFromPerformance(5000, 1200));
  });

  it('is monotonic in distance', () => {
    expect(vdotFrom20MinTt(4000)).toBeLessThan(vdotFrom20MinTt(5000));
  });

  it('rejects a nonsense distance', () => {
    expect(() => vdotFrom20MinTt(0)).toThrow(RangeError);
  });
});

describe('formatting', () => {
  it('formats paces and durations the way runners write them', () => {
    expect(formatPace(255)).toBe('4:15');
    expect(formatPace(305)).toBe('5:05');
    expect(formatDuration(1197)).toBe('19:57');
    expect(formatDuration(11_449)).toBe('3:10:49');
  });

  it('parses what it formats', () => {
    for (const s of [59, 1197, 3600, 11_449]) {
      expect(parseDuration(formatDuration(s))).toBe(s);
    }
  });

  it('accepts a bare number of seconds', () => {
    expect(parseDuration('90')).toBe(90);
  });

  it('rejects what it cannot parse', () => {
    expect(() => parseDuration('nope')).toThrow(RangeError);
    expect(() => parseDuration('1:2:3:4')).toThrow(RangeError);
  });

  it('formats a pace band', () => {
    expect(formatRange([254, 279])).toBe('4:14-4:39');
  });
});
