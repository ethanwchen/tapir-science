/**
 * The README is documentation, so it is tested like documentation.
 *
 * Every number quoted in an example below is asserted here. If the model
 * changes, this fails and the README gets fixed with it.
 */

import { describe, expect, it } from 'vitest';
import {
  carbsToCarry, equivalentTime, estimateLthr, estimateMaxHr, fitCriticalSpeed,
  fluidGuidance, formatDuration, formatRange, fuelTargets, hrZones,
  maxSafeWeeklyLoad, parseDuration, racePredictions, runLoad, trainingPaces,
  vdotFrom20MinTt, vdotFromCriticalSpeed, vdotFromPerformance, workloadRatio,
  workloadVerdict, zoneOfHr,
} from '../src/index.js';

describe('README examples', () => {
  it('converts a 10K into every other distance', () => {
    const vdot = vdotFromPerformance(10_000, 41 * 60 + 21);
    expect(vdot.toFixed(2)).toBe('49.97');

    const times = racePredictions(vdot);
    expect(formatDuration(times['5k'])).toBe('19:57');
    expect(formatDuration(times.half)).toBe('1:31:34');
    expect(formatDuration(times.marathon)).toBe('3:10:46');
  });

  it('converts a 5K straight into a marathon', () => {
    expect(formatDuration(equivalentTime(5000, parseDuration('19:57'), 42_195))).toBe('3:10:49');
  });

  it('gives the training paces quoted for VDOT 50', () => {
    const paces = trainingPaces(50);
    expect(formatRange(paces.E)).toBe('5:14-5:46');
    expect(formatRange(paces.T)).toBe('4:13-4:20');
    expect(formatRange(paces.I)).toBe('3:52-3:59');
  });

  it('never lets the easy band open faster than easy pace', () => {
    // The band exists to stop easy runs drifting toward threshold. A quick
    // end ahead of target would license exactly that.
    for (const vdot of [30, 40, 50, 60, 70]) {
      const [fast] = trainingPaces(vdot).E;
      const [, marathonSlow] = trainingPaces(vdot).M;
      expect(fast).toBeGreaterThan(marathonSlow);
    }
  });

  it('gives the heart-rate bands quoted for LTHR 170', () => {
    expect(hrZones(170)).toEqual([
      { zone: 'Z1', name: 'Recovery', minBpm: 102, maxBpm: 137 },
      { zone: 'Z2', name: 'Easy', minBpm: 138, maxBpm: 152 },
      { zone: 'Z3', name: 'Steady', minBpm: 153, maxBpm: 159 },
      { zone: 'Z4', name: 'Threshold', minBpm: 160, maxBpm: 169 },
      { zone: 'Z5', name: 'VO2max', minBpm: 170, maxBpm: 190 },
    ]);
    expect(zoneOfHr(170, 168)).toBe('Z4');
  });

  it('gives the load and workload figures quoted', () => {
    expect(Math.round(runLoad(10_000, 45 * 60, 50))).toBe(67);

    const daily = [...Array<number>(21).fill(50), ...Array<number>(7).fill(65)];
    const ratio = workloadRatio(daily);
    expect(ratio.acute).toBe(65);
    expect(ratio.chronic).toBe(53.75);
    expect(ratio.ratio.toFixed(3)).toBe('1.209');
    expect(workloadVerdict(ratio.ratio)).toBe('safe');
    expect(Math.round(maxSafeWeeklyLoad(daily))).toBe(556);
  });

  it('gives the critical-speed fit quoted', () => {
    const fit = fitCriticalSpeed([
      { distanceM: 1500, durationS: 300 },
      { distanceM: 3000, durationS: 660 },
      { distanceM: 5000, durationS: 1180 },
      { distanceM: 9000, durationS: 2280 },
    ])!;
    expect(fit.cs.toFixed(3)).toBe('3.766');
    expect(fit.dPrime.toFixed(1)).toBe('463.2');
    expect(fit.r2.toFixed(4)).toBe('0.9993');
    expect(fit.pointsUsed).toBe(4);
    expect(vdotFromCriticalSpeed(fit.cs).toFixed(1)).toBe('47.6');
  });

  it('gives the fuelling figures quoted', () => {
    expect(fuelTargets([{ durationS: 170 * 60 }], 70)).toMatchObject({
      dayType: 'long_big',
      dailyCarbsPerKg: [8, 10],
      dailyCarbsG: [560, 700],
      preSessionG: 175,
      preSessionHoursBefore: [3, 4],
      duringGPerHour: [60, 90],
    });
    expect(carbsToCarry(4 * 3600)!.grams).toBe(300);
    expect(fluidGuidance(2 * 3600, 26)).toBe(
      'Drink to thirst, roughly 500-800ml per hour with 300-600mg of sodium per litre.',
    );
  });

  it('reads the field test and the age fallbacks as quoted', () => {
    expect(vdotFrom20MinTt(4800).toFixed(1)).toBe('46.9');
    expect(estimateMaxHr(32)).toBe(186);
    expect(estimateLthr(estimateMaxHr(32))).toBe(167);
  });
});
