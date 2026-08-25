import { describe, expect, it } from 'vitest';
import {
  bestPerDuration, fitCriticalSpeed, predictFromCriticalSpeed, vdotFromCriticalSpeed,
} from '../src/index.js';

/** Efforts generated from a known model: d = CS*t + D'. */
function synthetic(cs: number, dPrime: number, durations: number[]) {
  return durations.map((t) => ({ distanceM: cs * t + dPrime, durationS: t }));
}

describe('fitting critical speed', () => {
  it('recovers the parameters it was generated from', () => {
    const fit = fitCriticalSpeed(synthetic(4, 200, [180, 360, 720, 1500, 2340]))!;
    expect(fit.cs).toBeCloseTo(4, 6);
    expect(fit.dPrime).toBeCloseTo(200, 4);
    expect(fit.r2).toBeCloseTo(1, 6);
  });

  it('ignores easy running at the same durations', () => {
    const good = synthetic(4, 200, [180, 360, 720, 1500, 2340]);
    const junk = synthetic(2.6, 0, [180, 360, 720, 1500, 2340]);
    expect(fitCriticalSpeed([...good, ...junk])!.cs).toBeCloseTo(4, 6);
  });

  it('ignores efforts outside the window where the model holds', () => {
    const tooShort = [{ distanceM: 400, durationS: 60 }];
    const tooLong = [{ distanceM: 42_195, durationS: 3 * 3600 }];
    expect(fitCriticalSpeed([...synthetic(4, 200, [300, 600, 1200]), ...tooShort, ...tooLong])!.cs)
      .toBeCloseTo(4, 6);
  });

  it('declines rather than guessing from too little', () => {
    expect(fitCriticalSpeed([])).toBeNull();
    expect(fitCriticalSpeed(synthetic(4, 200, [300, 600]))).toBeNull();
    // Three efforts at nearly the same duration is one data point, not three.
    expect(fitCriticalSpeed(synthetic(4, 200, [600, 610, 620]))).toBeNull();
  });

  it('reports a poor fit rather than hiding it', () => {
    const noisy = [
      { distanceM: 1400, durationS: 300 },
      { distanceM: 4000, durationS: 600 },
      { distanceM: 4200, durationS: 1200 },
      { distanceM: 12_000, durationS: 1800 },
    ];
    const fit = fitCriticalSpeed(noisy);
    if (fit) expect(fit.r2).toBeLessThan(0.99);
  });
});

describe('keeping the best effort per duration', () => {
  it('picks the fastest in each bucket and sorts by time', () => {
    const best = bestPerDuration([
      { distanceM: 2000, durationS: 600 },
      { distanceM: 2600, durationS: 610 },
      { distanceM: 1000, durationS: 240 },
    ]);
    expect(best).toEqual([
      { distanceM: 1000, durationS: 240 },
      { distanceM: 2600, durationS: 610 },
    ]);
  });

  it('drops nonsense entries', () => {
    expect(bestPerDuration([{ distanceM: 0, durationS: 600 }, { distanceM: 100, durationS: 0 }]))
      .toEqual([]);
  });
});

describe('using the fit', () => {
  const fit = fitCriticalSpeed(synthetic(4, 200, [180, 360, 720, 1500, 2340]))!;

  it('predicts a time inside the model window', () => {
    expect(predictFromCriticalSpeed(fit, 5000)).toBeCloseTo((5000 - 200) / 4, 3);
  });

  it('refuses a distance inside the anaerobic reserve', () => {
    expect(() => predictFromCriticalSpeed(fit, 100)).toThrow(RangeError);
  });

  it('converts to a VDOT comparable with race results', () => {
    expect(vdotFromCriticalSpeed(4)).toBeCloseTo(51.3, 0);
    expect(vdotFromCriticalSpeed(4.5)).toBeGreaterThan(vdotFromCriticalSpeed(4));
  });
});
