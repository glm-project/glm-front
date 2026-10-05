# Design system

The fronts share visual roles, not duplicate palettes. `src/main/webapp/styles.css` is the single source for
colour, typography, touch size and font-family tokens.

## Name roles, not values

Use the fourteen colour roles already declared: surfaces and text (`canvas`, `surface`, `sunken`, `border`,
`border-strong`, `ink`, `ink-muted`), action (`accent`, `on-accent`) and state (`ok`, `danger`, `nc`, `sans-affectation`,
`warn`). Choose the role that matches the meaning; a screen does not create a second value for an existing role.

`danger` carries errors, refusals and destructive actions. `nc` carries the
non-conformity: it is never a foreground colour, and text placed on `nc` is `ink`. It paints backgrounds, borders
and hatching; never let its border alone signal an NC, since it reaches only 1.9:1 on `surface`. See
[ADR 0040](adr/0040-colour-non-conformity-yellow.md).

Typography has six levels: `display`, `title`, `section`, `body`, `body-sm` and `label`. Use their Tailwind
utilities rather than assembling a seventh size/weight combination. Touch targets use `spacing-touch`
(44 px) and `spacing-touch-lg` (52 px); keep them in pixels because the physical target does not scale with
reading distance.

`@theme static` is required. Tailwind scans templates, not stylesheets, while Material and component CSS read
tokens through `var()`. Static publication keeps every role available even when no utility currently names it.

Two radius roles shape every surface: `radius-control` (buttons, inputs, segmented filters) and
`radius-surface` (cards, dialogs). Material reads them through its bridge.

`--font-sans` is the page family and uses a system stack. `--font-mono` is the family for a character-by-character
value the reader has to transcribe, such as the pupitre's enrolment code. Both are system stacks: boot documents
load no remote font.

## Fronts choose tokens; they do not redefine them

The pupitre's sole stylesheet override is `html { font-size: 20px }`. This scales rem typography for a kiosk
read at arm's length while leaving pixel touch targets physical. `DesignTokensTest` holds that stylesheet to
one selector and one property.

A front may choose a larger existing role, such as `text-display` or `min-h-touch-lg`. Keep colour, type and
spacing definitions in the shared theme.

## Three barriers enforce the contract

- `local/no-token-bypass` rejects static native Tailwind colour families, white/black shortcuts, arbitrary hex
  colours, arbitrary text sizes and literal inline `color`, `background` or `font-size` declarations whose raw
  value is a hex colour or a numeric size in TypeScript and templates. It also refuses `nc` as a foreground
  colour (`text-nc`, `decoration-nc`, `caret-nc`, `placeholder-nc`, `fill-nc`, `stroke-nc`, variants and opacity
  included). It does not parse computed bindings, stylesheets or semantic role choices; review those against
  this document.
- `DesignTokensTest` verifies token publication, front overrides, Material references and WCAG AA contrast
  for the text/background pairs used by screens.
- `MaterialBridge.spec.ts` verifies computed browser styles so a declaration that never reaches the page
  cannot pass on text matching alone.

Dynamic class bindings are outside the lint rule's static reach. Prefer literal role classes. If a computed
binding is required, justify the narrow tooling directive in the commit or MR.

State colours other than `nc` also serve as text on `sunken`; preserve their measured contrast and rerun the token
test after changing any colour.

## Gestion shares its screen surfaces

`gestion/shared/design-system/infrastructure/primary/surfaces.css` owns what every gestion screen repeats:
the card that carries a table and its paginator, the table scroller, the segmented filter, the state dot, the
type tag, the row actions and the back link. Its classes are prefixed `gestion-` so they never meet a
component's local class. A screen keeps only its own column widths and specific drawings.

## Gestion shares presentation contracts, not business workflows

Reusable Gestion controls live under its existing design-system primary adapter. A shared component receives
rendering values and emits UI intentions; the consuming context keeps its domain models, validation,
read resources, command locks, refusal interpretation and navigation.

`TextField` owns a native text input and its associated label, help and error announcement. The parent owns
the form and disabled fieldset, supplies the raw string and decides when a domain error is visible. Fields
with autocomplete, multiple selections or immediate domain normalization remain local. The common form
stylesheet is loaded with component encapsulation so it also styles those local fields without adding global
unprefixed classes.

`DateTimeField` pairs Material's `datepicker` and `timepicker` behind the shared `.field-input` style. It receives an
instant as text and its labels, and emits the offset instant the user composed, or an empty text while the date or the
hour is missing or impossible. It emits only on a user gesture, so an untouched instant keeps its precision. The
lazy component that renders it provides `provideGestionDateAdapter()` in its own `providers`.

`ErrorMessage` renders a failed read and its retry action; the parent decides which read to retry. Loading,
empty states and business refusals retain their local composition. `ConfirmationContent` renders the content
of a Material dialog; its owning context retains the command, synchronous duplicate-action guard,
`MatDialogRef`, pending close policy and success/refusal handling.

A searchable picker shares only the trigger, overlay, search input and focus protocol. Its consumers retain
option rendering, search normalization, sorting and selection types. Preserve the local panel semantics and
close policy when extracting it; sharing markup does not authorize changing an interaction.

Paginator labels use a technical factory while each consumer keeps its own `MatPaginatorIntl` provider and
contextual labels. Reuse Material's paginator directly instead of introducing a wrapper around the same API.

## The pupitre confirms a gesture with a sustained press

`pupitre/shared/design-system/infrastructure/primary/long-press/long-press.ts` owns the `glmLongPress` primitive.
It emits `longPressed` once its host has been held for the duration the consumer binds
(`[glmLongPress]="durationMs"`). Releasing, a pointer cancelled by a scroll, or a host that is `:disabled` at the
press or at the deadline emits nothing, and the context menu a touch long press opens is prevented. The host always
carries the `--long-press-duration` variable and carries the `long-press--holding` class only while held; the
consuming component draws the fill, as the pointage does with `.hold-target::before`, because the pupitre stylesheet holds a single
rule. See [ADR 0044](adr/0044-confirm-pupitre-gestures-with-a-sustained-press.md).

## Only rendering code depends on the design system

The design system is a shared kernel that depends on no business context. Only primary adapters render and
may depend on it; domain, application and secondary adapters remain independent. `HexagonalArchTest` enforces
both directions.

Composition roots may import the shared visual adapters to assemble their front. The roots are outside the
architecture scan by design; keep business behavior in their front-specific composition or its owning
context, never in the shared chrome.

For Angular Material integration read [`material.md`](material.md). For the icon primitive and drawing set
read [`icons.md`](icons.md).
