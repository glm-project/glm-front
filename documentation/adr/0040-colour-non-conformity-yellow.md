# 0040 — Colour non-conformity yellow

## Status

Accepted. Complemented by [0041](0041-sort-workshop-supervision-into-state-lanes.md) and amended by
[0047](0047-count-only-finished-activities.md): green marks Au travail, existing neutral tokens mark Sans
activité, and yellow NC remains an overlay on interpretable current activities. `danger` serves errors,
refusals and destructive actions; `warn` serves the pupitre's PAUSE and REPRENDRE commands.

## Context

On 25/09/2026 the client fixed yellow for non-conformity. The existing red `nc` role (`#b91c1c`) also painted
errors, refusals and destructive actions in both fronts, so its name no longer expressed one meaning.
The client's orange for pause is the accepted brown `warn` role (`#854d0e`), now confined to the pupitre's
pause commands. The lane colours follow ADR 0047 rather than adding another NC or error role.

Yellow cannot replace red directly: `#eab308` reaches only 1.9:1 on `surface`, making foreground text and a
colour-only state unreadable.

## Considered options

- Rename `nc` to `danger` and create a new yellow `nc` role — **kept**.
- Keep `nc` red and add a separate "non-conformity" role — rejected: the name `nc` would keep naming the
  colour of errors and would lie to every reader.
- Turn `nc` yellow — rejected: every error message and destructive action would become yellow text and
  illegible.

## Decision

Keep `danger` (`#b91c1c`) for errors, refusals and destructive actions.
Keep `warn` for the pupitre's PAUSE and REPRENDRE commands; it paints no supervision lane.

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
