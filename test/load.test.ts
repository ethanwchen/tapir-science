import { describe, expect, it } from 'vitest';
import {
  ACWR_DANGER, hrLoad, maxSafeWeeklyLoad, paceSecPerKm, runLoad,
  workloadRatio, workloadSeries, workloadVerdict,
} from '../src/index.js';

const VDOT = 50;

/** Distance covered in `seconds` at a given pace, metres. */
function atPace(seconds: number, secPerKm: number): number {
  return (seconds / secPerKm) * 1000;
}

describe('training load', () => {
  it('scores an hour at threshold as 100', () => {
    const threshold = paceSecPerKm(VDOT, 'T');
    expect(runLoad(atPace(3600, threshold), 3600, VDOT)).toBeCloseTo(100, 4);
  });

  it('charges far more for an hour hard than an hour easy', () => {
    const easy = runLoad(atPace(3600, paceSecPerKm(VDOT, 'E')), 3600, VDOT);
    const hard = runLoad(atPace(3600, paceSecPerKm(VDOT, 'T')), 3600, VDOT);
    expect(hard).toBeGreaterThan(easy * 1.4);
  });

  it('caps intensity so one short sprint cannot dominate a week', () => {
    const sprint = runLoad(atPace(120, paceSecPerKm(VDOT, 'R')), 120, VDOT);
    const uncapped = (120 * Math.pow(paceSecPerKm(VDOT, 'T') / paceSecPerKm(VDOT, 'R'), 2)) / 36;
    expect(sprint).toBeLessThan(uncapped);
  });

  it('returns nothing for a non-session', () => {
    expect(runLoad(0, 0, VDOT)).toBe(0);
    expect(hrLoad(0, 150, 170)).toBe(0);
    expect(hrLoad(3600, 150, 0)).toBe(0);
  });

  it('scores an hour at threshold heart rate as 100 too', () => {
    expect(hrLoad(3600, 170, 170)).toBeCloseTo(100, 4);
  });

  it('lets heart rate capture work that pace misses', () => {
    // Same duration, same slow pace -- but up a mountain in the heat.
    const flat = hrLoad(3600, 140, 170);
    const climbing = hrLoad(3600, 165, 170);
    expect(climbing).toBeGreaterThan(flat);
  });
});

describe('acute:chronic workload ratio', () => {
  const steady = Array.from({ length: 40 }, () => 50);

  it('sits at 1.0 for unchanging training', () => {
    expect(workloadRatio(steady).ratio).toBeCloseTo(1, 6);
  });

  it('rises when the last week jumps', () => {
    const spiked = [...steady.slice(0, 33), ...Array.from({ length: 7 }, () => 150)];
    expect(workloadRatio(spiked).ratio).toBeGreaterThan(ACWR_DANGER);
  });

  it('falls during a taper', () => {
    const tapered = [...steady.slice(0, 33), ...Array.from({ length: 7 }, () => 15)];
    expect(workloadRatio(tapered).ratio).toBeLessThan(0.8);
  });

  it('reports 1.0 rather than infinity with no history', () => {
    expect(workloadRatio([]).ratio).toBe(1);
    expect(workloadRatio([0, 0, 0]).ratio).toBe(1);
  });

  it('names what the number means', () => {
    expect(workloadVerdict(1.0)).toBe('safe');
    expect(workloadVerdict(0.6)).toBe('detraining');
    expect(workloadVerdict(1.4)).toBe('high');
    expect(workloadVerdict(1.8)).toBe('danger');
  });

  it('produces a ratio at every point for charting', () => {
    const series = workloadSeries(steady);
    expect(series).toHaveLength(steady.length);
    expect(series.at(-1)!.ratio).toBeCloseTo(1, 6);
  });

  it('is dimensionless, so big and small athletes compare', () => {
    const small = Array.from({ length: 40 }, () => 20);
    const big = Array.from({ length: 40 }, () => 200);
    expect(workloadRatio(small).ratio).toBeCloseTo(workloadRatio(big).ratio, 6);
  });
});

describe('planning next week', () => {
  it('answers how much can safely be done', () => {
    const daily = Array.from({ length: 28 }, () => 50);
    const allowed = maxSafeWeeklyLoad(daily);
    // Adding exactly that much must land on the ceiling, not past it.
    const next = [...daily, ...Array.from({ length: 7 }, () => allowed / 7)];
    expect(workloadRatio(next).ratio).toBeCloseTo(1.3, 2);
  });

  it('scales with what the athlete is conditioned for', () => {
    const light = maxSafeWeeklyLoad(Array.from({ length: 28 }, () => 20));
    const heavy = maxSafeWeeklyLoad(Array.from({ length: 28 }, () => 200));
    expect(heavy).toBeGreaterThan(light);
  });
});
