import { describe, expect, it } from 'vitest';
import { carbsToCarry, classifyDay, fluidGuidance, fuelTargets } from '../src/index.js';

const long = { durationS: 170 * 60 };
const moderate = { durationS: 100 * 60 };
const easy = { durationS: 45 * 60 };
const hard = { durationS: 60 * 60, quality: true };

describe('classifying a day', () => {
  it('separates rest, easy, quality, and the two sizes of long run', () => {
    expect(classifyDay([])).toBe('rest');
    expect(classifyDay([easy])).toBe('easy_short');
    expect(classifyDay([hard])).toBe('quality');
    expect(classifyDay([moderate])).toBe('long_moderate');
    expect(classifyDay([long])).toBe('long_big');
  });

  it('adds up a double day', () => {
    expect(classifyDay([easy, easy])).toBe('long_moderate');
  });

  it('lets race week override everything', () => {
    expect(classifyDay([easy], { raceWeek: true })).toBe('race_week');
  });
});

describe('carbohydrate targets', () => {
  it('periodises to the session rather than prescribing one number', () => {
    expect(fuelTargets([], 70).dailyCarbsG![1]).toBeLessThan(fuelTargets([long], 70).dailyCarbsG![0]);
  });

  it('gives concrete grams when bodyweight is known', () => {
    const t = fuelTargets([long], 70);
    expect(t.dailyCarbsG).toEqual([560, 700]);
    expect(t.preSessionG).toBe(175);
    expect(t.duringGPerHour).toEqual([60, 90]);
  });

  it('gives per-kilogram figures without it', () => {
    const t = fuelTargets([long]);
    expect(t.dailyCarbsG).toBeUndefined();
    expect(t.preSessionG).toBeUndefined();
    expect(t.dailyCarbsPerKg).toEqual([8, 10]);
  });

  it('asks for nothing special on a rest day', () => {
    const t = fuelTargets([], 70);
    expect(t.duringGPerHour).toBeUndefined();
    expect(t.preSessionG).toBeUndefined();
  });

  it('loads race week hardest of all', () => {
    expect(fuelTargets([easy], 70, { raceWeek: true }).dailyCarbsPerKg).toEqual([8, 12]);
  });

  it('scales with the athlete', () => {
    expect(fuelTargets([long], 90).dailyCarbsG![0]).toBeGreaterThan(fuelTargets([long], 55).dailyCarbsG![0]);
  });
});

describe('what to carry', () => {
  it('says nothing for a short run', () => {
    expect(carbsToCarry(50 * 60)).toBeNull();
  });

  it('scales with time out there', () => {
    const twoHours = carbsToCarry(2 * 3600)!;
    const fourHours = carbsToCarry(4 * 3600)!;
    expect(fourHours.grams).toBeGreaterThan(twoHours.grams * 1.5);
  });

  it('warns about the transporter ceiling only when it applies', () => {
    expect(carbsToCarry(2 * 3600)!.note).not.toContain('fructose');
    expect(carbsToCarry(4 * 3600)!.note).toContain('2:1 glucose-to-fructose');
    expect(carbsToCarry(4 * 3600)!.note).toContain('practise it in training');
  });
});

describe('fluid', () => {
  it('stays quiet under an hour', () => {
    expect(fluidGuidance(45 * 60)).toBeNull();
  });

  it('scales with heat and duration', () => {
    expect(fluidGuidance(90 * 60, 28)).toContain('500-800ml');
    expect(fluidGuidance(90 * 60, 10)).toContain('400-600ml');
    expect(fluidGuidance(150 * 60, 10)).toContain('sodium');
  });

  it('anchors on thirst, because overdrinking is the dangerous error', () => {
    expect(fluidGuidance(2 * 3600)).toContain('Drink to thirst');
  });
});

describe('what this library refuses to do', () => {
  it('never mentions calories, deficits, or weight loss', () => {
    const forbidden = ['calorie', 'deficit', 'weight loss', 'bmi', 'lose weight'];
    const surfaces = [
      JSON.stringify(fuelTargets([long], 70)),
      JSON.stringify(fuelTargets([], 70)),
      carbsToCarry(4 * 3600)!.note,
      fluidGuidance(2 * 3600) ?? '',
    ].join(' ').toLowerCase();
    for (const word of forbidden) expect(surfaces).not.toContain(word);
  });
});
