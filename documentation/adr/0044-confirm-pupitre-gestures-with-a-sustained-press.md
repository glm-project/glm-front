# 0044 — Confirm pupitre gestures with a sustained press

## Status

`Accepted`

The hold was first set to 1.5 s and has been shortened to 1 s; the rest of the decision is unchanged.

## Context

On the pupitre's pointage screen a single tap on a tile target, a global command or a workstation choice declared a
gesture at once. The console stands on the shop floor: an operator brushing the screen, resting a glove on it or
scrolling the grid could start, stop, pause or place an element in non-conformity by accident, and every such
gesture is accepted durably and then published.

The tile targets were also small: 44 px buttons with a `label`-size caption in a grid of about eight columns. Molds
now sit two per row with `touch-lg` targets and `section` captions, which gives each target more room but does not
by itself prevent an accidental tap.

The header already offered a hand-made three-second hold on the logo to open the administration reset, so a
sustained press was a known gesture on this console.

## Considered options

- Hold the target for 1 s, with a fill that shows the progress, before declaring the gesture — **kept**.
- Keep the tap — rejected: it is the source of the accidental gestures.
- Double tap — rejected: two quick taps are as easy to make by accident as one, and nothing shows that the first
  one counted.
- Ask for confirmation in a dialog — rejected: every gesture would cost a second target and a second reach, and a
  confirmation answered by reflex protects nothing.
- Swipe to confirm — rejected: a swipe on a target inside a scrolling grid conflicts with scrolling the grid itself.

## Decision

Every gesture target of the pointage screen — the two targets of each tile, PAUSE, REPRENDRE, TOUT ARRÊTER and each
workstation choice — declares its intention only after it has been held for 1 s. Releasing it or cancelling the
pointer by scrolling before the deadline declares nothing, and neither does a target that is unavailable when the
hold begins or when it reaches its deadline. The gesture receives its identity and its time at the deadline. Two
holds that reach their deadline together declare at most one intention per tile and one workstation choice: the
screen enforces its exclusion from its own state, not from the rendered `disabled` attribute.
« Annuler » in the workstation dialog and « J'ai fini » in the header stay immediate: they declare nothing to the
workshop.

The `glmLongPress` directive of `pupitre/shared/design-system` carries the timer, the availability checks and the
suppression of the touch context menu; the consumer binds the duration. The logo's reset hold uses the same
directive with its own three seconds. The pointage draws a fill across the held target over the confirmation delay,
and its targets refuse text selection and the touch callout.

## Consequences

### Positive

- A brush, a resting hand or a scroll no longer declares a gesture.
- The fill shows the operator that the press is being counted and when it will be.
- One primitive owns every sustained press of the pupitre, the reset hold included.

### Negative

- Each gesture takes 1 s longer, which an operator declaring many gestures in a row will feel.
- The gesture targets no longer answer a click: neither a physical keyboard nor an assistive technology that
  activates by click can declare a gesture. Nothing in the workshop needs them today; supporting them would reopen
  this decision.
- The browser suites hold each target for the whole delay, which lengthens them.
- The directive checks that its host is `:disabled` only when the hold begins and when it reaches its deadline: a
  target briefly disabled in between still completes its hold, and a target made unavailable by other means than
  `disabled` would too.
- A target keeps its position while its meaning may change during the hold: if a server refusal reconciles the tile
  within that second, the held ARRÊTER becomes DÉMARRER and the deadline declares the new meaning. The window was
  about a tenth of a second with a tap.
