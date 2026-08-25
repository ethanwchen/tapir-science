# tapir-vdot

Daniels' VDOT running model, as a small TypeScript library. Race prediction,
equivalent performances, training paces, and heart-rate zones.

Zero dependencies. Pure functions, no state, no I/O.

> **Status: early.** Extracted from [Tapir](https://github.com/ethanwchen), an
> endurance training app, and published while the API is still settling. The
> maths is stable and tested against the published tables; the function names
> may still move before 1.0.

## Install

```bash
npm install tapir-vdot
```

## What VDOT is

A single number describing aerobic running fitness. Its usefulness is that it
converts cleanly in both directions: give it one race result and it will tell
you what you can run at any other distance, and what paces you should be
training at to improve.

```ts
import { vdotFromPerformance, racePredictions, formatDuration } from 'tapir-vdot';

const vdot = vdotFromPerformance(10_000, 41 * 60 + 21); // 49.97

const times = racePredictions(vdot);
formatDuration(times['5k']);      // '19:57'
formatDuration(times.half);       // '1:31:34'
formatDuration(times.marathon);   // '3:10:46'
```

Or skip the intermediate step:

```ts
import { equivalentTime, parseDuration, formatDuration } from 'tapir-vdot';

// I ran 19:57 for 5K. What is a realistic marathon?
formatDuration(equivalentTime(5000, parseDuration('19:57'), 42_195)); // '3:10:49'
```

## Training paces

Five intensities, after Daniels: **E**asy, **M**arathon, **T**hreshold,
**I**nterval, **R**epetition. Each returns a band in seconds per kilometre.

```ts
import { trainingPaces, formatRange } from 'tapir-vdot';

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
import { hrZones, zoneOfHr, estimateMaxHr, estimateLthr } from 'tapir-vdot';

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

## The field test

The most practical way to get a VDOT without racing: run as far as you can in
twenty minutes.

```ts
import { vdotFrom20MinTt } from 'tapir-vdot';

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

## Caveats

VDOT is a model of aerobic fitness, and it assumes you are trained for the
distance you are asking about. It will happily tell a 5K specialist their
marathon time, and it will be optimistic — the model knows nothing about
whether you have done the long runs, or about fuelling, heat, hills, or the
wall. Treat marathon predictions from short-distance results as a ceiling
rather than a plan.

Efforts under about four minutes are too anaerobic for the model to read, and
much over three hours it stops behaving.

None of this is medical advice.

## Development

```bash
npm install
npm test        # 43 tests, including calibration against the published tables
                # and every number quoted in this README
npm run build
```

## Licence

MIT
