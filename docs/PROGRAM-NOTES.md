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

## Standing constraint: asymmetric knee extension ROM

**Status:** standing constraint, not a task. Recorded 2026-08-03.

The non-surgical leg **hyperextends**; the surgical leg does not. The two legs
therefore reach different amounts of knee extension, so a bilateral hamstring
movement cannot put both sides at the same muscle length — the hyperextending
side reaches a longer position at the same hip angle, and the surgical side
runs out of range first.

Consequences for programming decisions:

- **Prefer unilateral hamstring work** where the loading position depends on
  knee extension. Each leg then works through the range it actually has instead
  of being averaged against the other. Currently unilateral: seated leg curl,
  single-leg RDL.
- **Match the stretch, not the depth.** Reps and depth will not look the same
  side to side, and forcing them to match means one side is short and the other
  is at end range. The felt stretch is the target.
- **Don't cue a locked stance knee.** On the hyperextending leg, locking back
  into full extension shifts load to the posterior capsule and masks hamstring
  tension. Soft knee on both sides.
- **The Nordic curl stays bilateral by choice.** Eccentric overload is the
  reason it's in the program, and a single-leg Nordic is well past what one leg
  can control. Accepting that the hyperextending side reaches further is the
  trade being made here, knowingly.
- **Watch for load asymmetry over time.** Once there's per-exercise history, a
  persistent gap in working load between legs on the single-leg lifts is the
  signal worth acting on — not the ROM difference itself, which is structural.

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

**Resolved 2026-08-20 — closed by choice, not by the numbers.**

Shrugs were dropped from Pull B. They were the only trap movement in the plan
and had never once been performed: they sat seventh of eight in a session
already running 18-21 sets, and upper-trap size is not a priority here.

So Traps now sits below MEV by decision. That is a legitimate place to be for a
muscle nobody is trying to grow — but it should not be read as a gap to close
later without asking first.

The data question in option 2 above is still open and still real: the rows in
this program credit no Traps at all, when loaded scapular retraction trains the
mid and lower trapezius substantially. Fixing that would raise the reported
figure by roughly 4.5 weekly sets on the current rowing volume, without changing
a single set of training. Worth doing for accuracy — the reported number is
currently lower than the truth — but it is a library-wide change affecting every
template, so it was left out of the per-day rebuild.
