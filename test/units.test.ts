/**
 * Units, and the round trips that have to hold.
 *
 * The interesting failures here are not wrong numbers, they are asymmetries:
 * a conversion out that does not survive a conversion back, or a formatter
 * that rounds in a way the parser cannot undo. Those show up as a distance
 * that drifts every time somebody switches units and back.
 */

import { describe, expect, it } from 'vitest';
import {
  formatClock, formatDistance, formatPaceIn, formatRep, fromDisplayDistance,
  METRES_PER_MILE, paceInUnits, toDisplayDistance, unitLabel, unitMetres,
} from '../src/units.js';

describe('units', () => {
  it('knows how long a mile is', () => {
    expect(METRES_PER_MILE).toBe(1609.344);
    expect(unitMetres('imperial')).toBe(METRES_PER_MILE);
    expect(unitMetres('metric')).toBe(1000);
  });

  it('survives a round trip in both systems', () => {
    for (const system of ['metric', 'imperial'] as const) {
      for (const metres of [1000, 5000, 10_000, 21_097, 42_195]) {
        const shown = toDisplayDistance(metres, system);
        expect(fromDisplayDistance(shown, system)).toBeCloseTo(metres, 6);
      }
    }
  });

  it('converts pace by the same factor as distance', () => {
    // A pace is time per unit, so switching units scales it by exactly the
    // ratio of the units. Anything else is a bug that only shows up as a
    // slightly wrong pace on one side of a settings toggle.
    const secPerKm = 300;
    expect(paceInUnits(secPerKm, 'metric')).toBe(300);
    expect(paceInUnits(secPerKm, 'imperial')).toBeCloseTo(300 * 1.609344, 4);
  });

  it('labels singular and plural', () => {
    expect(unitLabel('metric')).toBe('km');
    expect(unitLabel('imperial')).toBe('mi');
    expect(unitLabel('imperial', true).length).toBeGreaterThan(0);
  });

  it('formats a distance without a trailing zero', () => {
    expect(formatDistance(10_000, 'metric')).not.toMatch(/\.0/);
    expect(formatDistance(5000, 'metric')).toMatch(/^5/);
  });

  it('names a rep the way the runner would say it', () => {
    // A quarter-mile runner does not say "402 metres", and a metric runner
    // does not say "0.4 km". The names are the point of the function.
    expect(formatRep(400, 'metric')).toBe('400 m');
    expect(formatRep(400, 'imperial')).toBe('quarter mile');
    expect(formatRep(800, 'imperial')).toBe('half mile');
    expect(formatRep(1609, 'imperial')).toBe('1 mile');
    expect(formatRep(1000, 'metric')).toBe('1 km');
    // Nothing near a named distance falls back to plain metres.
    expect(formatRep(600, 'imperial')).toBe('600 m');
  });

  it('formats a duration in the unit somebody would say out loud', () => {
    expect(formatClock(45)).toBe('45 s');
    expect(formatClock(600)).toBe('10 min');
    expect(formatClock(3600)).toBe('1 h');
    expect(formatClock(4320)).toBe('1 h 12');
  });

  it('formats a pace as minutes and seconds', () => {
    expect(formatPaceIn(300, 'metric')).toMatch(/^5:00/);
  });
});
