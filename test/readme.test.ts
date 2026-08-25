/**
 * The README is documentation, so it is tested like documentation.
 *
 * Every number quoted in an example below is asserted here. If the model
 * changes, this fails and the README gets fixed with it.
 */

import { describe, expect, it } from 'vitest';
import {
  equivalentTime, estimateLthr, estimateMaxHr, formatDuration, formatRange,
  hrZones, parseDuration, racePredictions, trainingPaces, vdotFrom20MinTt,
  vdotFromPerformance, zoneOfHr,
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

  it('reads the field test and the age fallbacks as quoted', () => {
    expect(vdotFrom20MinTt(4800).toFixed(1)).toBe('46.9');
    expect(estimateMaxHr(32)).toBe(186);
    expect(estimateLthr(estimateMaxHr(32))).toBe(167);
  });
});
