import { describe, expect, it } from 'vitest';
import {
  estimateLthr, estimateMaxHr, HR_ZONES, hrZones, RPE_GUIDANCE,
  ZONE_FOR_PACE, zoneOfHr, PACE_KEYS,
} from '../src/index.js';

describe('heart-rate estimates', () => {
  it('uses Tanaka rather than 220 minus age', () => {
    expect(estimateMaxHr(30)).toBe(187);
    expect(estimateMaxHr(50)).toBe(173);
  });

  it('puts LTHR near 90% of max', () => {
    expect(estimateLthr(190)).toBe(171);
  });
});

describe('zone bands', () => {
  const bands = hrZones(170);

  it('returns all five in order', () => {
    expect(bands.map((b) => b.zone)).toEqual([...HR_ZONES]);
  });

  it('is contiguous with no gaps or overlaps', () => {
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i]!.minBpm).toBe(bands[i - 1]!.maxBpm + 1);
    }
  });

  it('ascends', () => {
    for (const b of bands) expect(b.maxBpm).toBeGreaterThan(b.minBpm);
  });

  it('names the bands in plain language', () => {
    expect(bands.map((b) => b.name)).toContain('Threshold');
  });
});

describe('classifying a heart rate', () => {
  it('puts threshold effort in Z4 and easy running in Z2', () => {
    expect(zoneOfHr(170, 168)).toBe('Z4');
    expect(zoneOfHr(170, 155)).toBe('Z3');
    expect(zoneOfHr(170, 145)).toBe('Z2');
    expect(zoneOfHr(170, 120)).toBe('Z1');
    expect(zoneOfHr(170, 178)).toBe('Z5');
  });

  it('agrees with the band it reports', () => {
    for (const band of hrZones(170)) {
      expect(zoneOfHr(170, band.minBpm + 1)).toBe(band.zone);
    }
  });
});

describe('running without a strap', () => {
  it('maps every training intensity to a zone and an effort description', () => {
    for (const key of PACE_KEYS) {
      expect(ZONE_FOR_PACE[key]).toBeDefined();
      expect(RPE_GUIDANCE[key]).toMatch(/RPE/);
    }
  });
});
