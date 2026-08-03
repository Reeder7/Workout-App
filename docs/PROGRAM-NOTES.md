# Program notes — open questions

Running list of programming decisions that are parked, not forgotten. Each one
records what the app's own volume math currently says, so the numbers can be
re-checked after any change to `src/data/templates.ts`, `src/data/exercises.ts`
or `src/data/landmarks.ts`.

How to recompute: weekly credited sets per muscle are the sum, across every day
of the plan, of each exercise's set count — full credit for the exercise's
`primary` muscle, half credit for each entry in `secondary`. Exercises flagged
`excludeFromVolume` (isometrics, sled work) are skipped. Landmarks live in
`src/data/landmarks.ts`.

---

## Traps sit below MEV

**Status:** open. Raised 2026-08-03.

`tpl-ppl-knee` credits **3 weekly sets to Traps against an MEV of 6** (MAV
12–20). It is the only muscle in the program below its minimum effective
volume — everything else is either "effective" or "productive".

Where the 3 sets come from: `barbell-shrug` on Pull B is the *only* exercise in
the plan with `primary: 'Traps'`. Deadlift, rack pull and face pull list Traps
as `secondary`, so they'd contribute half credit — but none of them are in this
plan. Nothing else credits Traps at all.

Two ways to fix it, and they are not the same kind of change:

1. **Programming fix** — take `barbell-shrug` from 3 sets to 5–6. Simple, but it
   breaks the "2–3 sets per exercise" cap that the rest of the program follows,
   so it would need a second trap movement instead (e.g. a shrug variation or a
   trap-biased row) rather than more sets on one lift.
2. **Data fix** — the exercise library probably *undercounts* trap involvement.
   Heavy rowing loads the traps isometrically, but `chest-supported-row`,
   `barbell-row` and `romanian-deadlift` don't list Traps in `secondary`. Adding
   it where it's genuinely true would raise the credited total without changing
   a single set of training.

The honest read is that option 2 is at least partly correct, which means the
"below MEV" figure is a measurement artifact as much as a real gap. Worth
resolving the data question first — otherwise a programming change gets made to
chase a number that was wrong.

**Not yet decided.**
