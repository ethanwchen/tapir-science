# tapir-science

Endurance training science as plain functions. VDOT race prediction and
training paces, heart-rate zones, training load and the acute:chronic
workload ratio, critical speed, and carbohydrate targets.

Zero dependencies. Pure functions, no state, no I/O, no clock.

Everything here is published science rather than anyone's secret sauce, and
all of it is more useful in the open than sitting in one app's private repo.

> **Status: early.** Extracted from Tapir, an endurance training app, and
> published while the API is still settling. The maths is stable and tested
> against the published tables; the function names may still move before 1.0.

## Install

```bash
npm install tapir-science
```

## What VDOT is

A single number describing aerobic running fitness. Its usefulness is that it
converts cleanly in both directions: give it one race result and it will tell
you what you can run at any other distance, and what paces you should be
training at to improve.

```ts
import { vdotFromPerformance, racePredictions, formatDuration } from 'tapir-science';

const vdot = vdotFromPerformance(10_000, 41 * 60 + 21); // 49.97

const times = racePredictions(vdot);
formatDuration(times['5k']);      // '19:57'
formatDuration(times.half);       // '1:31:34'
formatDuration(times.marathon);   // '3:10:46'
```

Or skip the intermediate step:

```ts
import { equivalentTime, parseDuration, formatDuration } from 'tapir-science';

// I ran 19:57 for 5K. What is a realistic marathon?
formatDuration(equivalentTime(5000, parseDuration('19:57'), 42_195)); // '3:10:49'
```

## Training paces

Five intensities, after Daniels: **E**asy, **M**arathon, **T**hreshold,
**I**nterval, **R**epetition. Each returns a band in seconds per kilometre.

```ts
import { trainingPaces, formatRange } from 'tapir-science';

const paces = trainingPaces(50);
formatRange(paces.E); // '5:14-5:46'  easy
formatRange(paces.T); // '4:13-4:20'  threshold
formatRange(paces.I); // '3:52-3:59'  VO2max intervals
```

Easy running gets a genuinely wide band, on purpose — and the band opens
downward only. The mistake easy runs actually make is drifting *faster*, up
toward threshold, where they cost real recovery and buy very little. A band
whose quick end sat ahead of easy pace would license exactly that, so the
target *is* the quick end.

These reproduce Daniels' published tables. At VDOT 50: E 5:14/km, M 4:28/km,
T 4:15/km, I 3:54/km, R 3:38/km, all within a few seconds.

## Heart-rate zones

Anchored on lactate threshold heart rate rather than max HR, for a practical
reason: LTHR is measurable in a 20-minute time trial, whereas true max HR is
not measurable without an all-out effort most runners should not be asked to
perform.

```ts
import { hrZones, zoneOfHr, estimateMaxHr, estimateLthr } from 'tapir-science';

hrZones(170);
// [ { zone: 'Z1', name: 'Recovery',  minBpm: 102, maxBpm: 136 },
//   { zone: 'Z2', name: 'Easy',      minBpm: 138, maxBpm: 152 },
//   { zone: 'Z3', name: 'Steady',    minBpm: 153, maxBpm: 159 },
//   { zone: 'Z4', name: 'Threshold', minBpm: 160, maxBpm: 169 },
//   { zone: 'Z5', name: 'VO2max',    minBpm: 170, maxBpm: 190 } ]

zoneOfHr(170, 168); // 'Z4'

// No idea what your LTHR is?
estimateLthr(estimateMaxHr(32)); // Tanaka for max HR, then 90% of it
```

For runners with no monitor at all, `RPE_GUIDANCE` describes each intensity by
feel and the talk test — which is a reliable way to hold an intensity, not a
consolation prize.

## Training load and injury risk

Load is rTSS: an hour at threshold scores 100, and cost scales with the square
of intensity, so a hard hour is worth far more than an easy one.

```ts
import { runLoad, hrLoad, workloadRatio, workloadVerdict } from 'tapir-science';

runLoad(10_000, 45 * 60, 50);   // 10K in 45:00 for a VDOT 50 runner => 67
hrLoad(3600, 158, 170);         // when pace lies -- trails, heat, hills
```

The acute:chronic workload ratio compares what you did this week against what
you are conditioned for. It is the most widely replicated injury-risk signal
in endurance sport, and the band below is where injury incidence is lowest.

```ts
// One number per day, chronological, rest days as 0.
// Three steady weeks at 50, then a week at 65:
const daily = [...Array(21).fill(50), ...Array(7).fill(65)];

workloadRatio(daily);   // { acute: 65, chronic: 53.75, ratio: 1.209 }
workloadVerdict(1.209); // 'safe' -- 'detraining' | 'safe' | 'high' | 'danger'
```

Rest days must be present as zeroes. The ratio is meaningless if you omit
them, and omitting them is the single most common way to compute it wrongly.

Both figures are *mean daily* load, so the ratio is dimensionless: a 30km a
week runner and a 130km a week runner are directly comparable.

And the question people actually want answered — how much can I do next week?

```ts
import { maxSafeWeeklyLoad } from 'tapir-science';

maxSafeWeeklyLoad(daily);       // 556 -- the weekly total that lands on 1.3
maxSafeWeeklyLoad(daily, 1.15); // or pick your own ceiling
```

## Critical speed

A second opinion on VDOT, derived from the *shape* of your speed-over-distance
curve rather than from any single result. Over roughly two to forty minutes,
distance is very nearly linear in time: `d = CS * t + D'`.

```ts
import { fitCriticalSpeed, vdotFromCriticalSpeed } from 'tapir-science';

const fit = fitCriticalSpeed([
  { distanceM: 1500, durationS: 300 },
  { distanceM: 3000, durationS: 660 },
  { distanceM: 5000, durationS: 1180 },
  { distanceM: 9000, durationS: 2280 },
]);
// { cs: 3.766, dPrime: 463.2, r2: 0.9993, pointsUsed: 4 }

vdotFromCriticalSpeed(fit.cs); // 47.6 -- comparable with a VDOT from a race
```

`cs` is the asymptotic sustainable velocity, close to lactate threshold.
`dPrime` is the finite work capacity available above it, in metres. `r2` is
reported so you can distrust a bad fit rather than acting on it — below about
0.95, the inputs are probably not all-out efforts.

It returns `null` rather than guessing when there are fewer than three
distinct durations to work with.

## Fuelling

Grams of carbohydrate per kilogram per day, periodised to the session. Eating
the same every day regardless of load is the mistake most amateurs make.

```ts
import { fuelTargets, carbsToCarry, fluidGuidance } from 'tapir-science';

fuelTargets([{ durationS: 170 * 60 }], 70);
// { dayType: 'long_big',
//   dailyCarbsPerKg: [8, 10], dailyCarbsG: [560, 700],
//   preSessionG: 175, preSessionHoursBefore: [3, 4],
//   duringGPerHour: [60, 90] }

carbsToCarry(4 * 3600);
// { grams: 300,
//   note: 'Above 60g per hour, use a 2:1 glucose-to-fructose blend and
//          practise it in training first.' }

fluidGuidance(2 * 3600, 26);
// 'Drink to thirst, roughly 500-800ml per hour with 300-600mg of sodium per litre.'
```

Bodyweight is optional — without it you get the per-kilogram figures.

**Deliberately absent:** calorie counting, weight-loss targeting, BMI, and
deficit recommendations. A library that tells endurance athletes to eat less
is a library that hurts people. There is a test asserting none of those words
appear in anything this module returns.

## The field test

The most practical way to get a VDOT without racing: run as far as you can in
twenty minutes.

```ts
import { vdotFrom20MinTt } from 'tapir-science';

vdotFrom20MinTt(4800); // 46.9
```

## API

| Function | Returns |
| --- | --- |
| `vdotFromPerformance(distanceM, durationS)` | VDOT implied by a result |
| `predictTime(vdot, distanceM)` | Predicted race time, seconds |
| `equivalentTime(fromM, fromS, toM)` | The same runner at another distance |
| `racePredictions(vdot)` | Every common distance at once |
| `trainingPaces(vdot)` | All five intensities as `[fast, slow]` sec/km |
| `paceSecPerKm(vdot, key)` / `paceSecPerMile` | One intensity |
| `vdotFrom20MinTt(distanceM)` | VDOT from a 20-minute time trial |
| `hrZones(lthr)` / `zoneOfHr(lthr, bpm)` | Heart-rate bands |
| `estimateMaxHr(age)` / `estimateLthr(maxHr)` | Fallbacks |
| `formatPace` / `formatDuration` / `parseDuration` / `formatRange` | Strings |
| `vo2AtVelocity` / `velocityAtVo2` / `percentMaxForDuration` | The raw curves |
| `runLoad(distanceM, durationS, vdot)` / `hrLoad(durationS, avgHr, lthr)` | Session load, rTSS |
| `workloadRatio(dailyLoads)` / `workloadVerdict(ratio)` | Acute:chronic ratio |
| `maxSafeWeeklyLoad(dailyLoads, ceiling?)` | How much next week can carry |
| `fitCriticalSpeed(efforts)` / `vdotFromCriticalSpeed(cs)` | Critical speed |
| `fuelTargets(sessions, weightKg?)` / `carbsToCarry` / `fluidGuidance` | Carbohydrate and fluid |

## The maths

Two curves from Daniels & Gilbert. The oxygen cost of running at velocity `v`
metres per minute:

```
VO2 = -4.60 + 0.182258*v + 0.000104*v²
```

And the fraction of VO2max sustainable for `t` minutes of racing, close to 1.0
around six minutes and decaying toward 0.8 over three hours:

```
%max = 0.8 + 0.1894393*e^(-0.012778*t) + 0.2989558*e^(-0.1932605*t)
```

VDOT is the first divided by the second. Going the other way — what time will
this VDOT run for a given distance — is implicit in duration, since how long
you are racing determines what fraction of maximum you can hold, so it is
solved numerically by bisection.

Heart-rate zones follow Friel's LTHR percentages; max HR from age uses
Tanaka's `208 - 0.7 × age`, which fits adult populations considerably better
than the folkloric `220 - age`.

Critical speed uses the two-parameter model, fitted by ordinary least squares
on distance against time. Load is rTSS, and the acute:chronic ratio uses
7-day and 28-day rolling means. Carbohydrate figures follow current
sports-nutrition consensus.

## Caveats

These are models, and every one of them has a domain. VDOT assumes you are
trained for the distance you are asking about. It will happily tell a 5K specialist their
marathon time, and it will be optimistic — the model knows nothing about
whether you have done the long runs, or about fuelling, heat, hills, or the
wall. Treat marathon predictions from short-distance results as a ceiling
rather than a plan.

Efforts under about four minutes are too anaerobic for VDOT to read, and much
over three hours it stops behaving. Critical speed holds over roughly two to
forty minutes and nowhere else. The acute:chronic ratio is a population-level
signal, not a personal verdict — it is good at flagging that a jump was large,
and says nothing about whether *you* will get hurt.

Fuelling figures are guidance, not medical or dietary advice.

None of this is medical advice.

## Development

```bash
npm install
npm test        # 84 tests, including calibration against the published tables
                # and every number quoted in this README
npm run build
```

## Licence

MIT
