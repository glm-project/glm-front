# 0040 — Colour non-conformity yellow and absence red

## Status

`Accepted`

- `Complemented by 0041: the supervision lanes apply this code, green at work, brown warn the pause, red danger the absence, and yellow nc laid over an activity.`

## Context

On 25/09/2026 the client fixed the colour code of the workshop: green for an operator at work, orange for a
pause, red for an absent operator and yellow for a non-conformity (NC). The design system's orange is the
brown `warn` role (`#854d0e`), which the client accepted as its orange.

[#7](https://github.com/glm-project/glm-front/issues/7) had made the red `nc` role (`#b91c1c`) the
non-conformity colour common to both fronts: the pupitre's NC tile, marker and toggle, the NC durations of
the coût de revient. [#12](https://github.com/glm-project/glm-front/issues/12) then borrowed that same red
for the Absent state of the supervision. Meanwhile every error message, refusal and destructive action of
both fronts was written in `text-nc` or `bg-nc`, so the name `nc` had come to mean "red" rather than
"non-conformity".

Yellow cannot take the place of red as it stands. `#eab308` reaches 1.9:1 on `surface`: as text or as the
only mark of a state, it is unreadable.

## Considered options

- Rename `nc` to `danger` and create a new yellow `nc` role — **kept**.
- Keep `nc` red and add a separate "non-conformity" role — rejected: the name `nc` would keep naming the
  colour of errors and would lie to every reader.
- Turn `nc` yellow — rejected: every error message and destructive action would become yellow text and
  illegible.

## Decision

Keep `danger` (`#b91c1c`) for errors, refusals, destructive actions and, in supervision, the Absent state.
Keep `warn` for the pause.

Declare `--color-nc: #eab308` for the non-conformity. It paints backgrounds, borders and hatching, **never
the foreground**. Text placed on `nc` is `ink`, at 9.3:1. `local/no-token-bypass` refuses `text-nc`,
`decoration-nc`, `caret-nc`, `placeholder-nc`, `fill-nc` and `stroke-nc` in TypeScript and templates, with
their variants and opacity modifiers. `bg-nc`, `border-nc`, `ring-nc` and `outline-nc` remain allowed. A
`color: var(--color-nc)` written in a stylesheet escapes the rule and is checked in review.

Never signal an NC by its yellow border alone, which reaches only 1.9:1 on `surface`: the hatching and the
word « NC » carry it.

## Consequences

### Positive

- Each colour means one thing across both fronts, and the client's code reads directly on screen.
- An error, a refusal or a destructive action stays red without being mistaken for a non-conformity.
- The lint catches yellow foreground text before it reaches a screen.

### Negative

- The pupitre changes its NC colour: operators who learnt red must learn yellow.
- The coût de revient can no longer write an NC duration in a coloured text; it needs a marker beside it.
- The name `nc` changes meaning. A `bg-nc` left on an older branch turns yellow without any failure, and the
  lint only catches the foreground.
- The design system counts fourteen colour roles instead of thirteen.
