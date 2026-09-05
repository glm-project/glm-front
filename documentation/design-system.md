# Design system

The fronts share visual roles, not duplicate palettes. `src/main/webapp/styles.css` is the single source for
colour, typography, touch size and font-family tokens.

## Name roles, not values

Use the thirteen colour roles already declared: surfaces and text (`canvas`, `surface`, `sunken`, `border`,
`border-strong`, `ink`, `ink-muted`), action (`accent`, `on-accent`) and state (`ok`, `nc`, `glm`, `warn`).
Choose the role that matches the meaning; a screen does not create a second value for an existing role.

Typography has six levels: `display`, `title`, `section`, `body`, `body-sm` and `label`. Use their Tailwind
utilities rather than assembling a seventh size/weight combination. Touch targets use `spacing-touch`
(44 px) and `spacing-touch-lg` (52 px); keep them in pixels because the physical target does not scale with
reading distance.

`@theme static` is required. Tailwind scans templates, not stylesheets, while Material and component CSS read
tokens through `var()`. Static publication keeps every role available even when no utility currently names it.

`--font-sans` is the page family and uses a system stack. Boot documents load no remote font.

## Fronts choose tokens; they do not redefine them

The pupitre's sole stylesheet override is `html { font-size: 20px }`. This scales rem typography for a kiosk
read at arm's length while leaving pixel touch targets physical. `DesignTokensTest` holds that stylesheet to
one selector and one property.

A front may choose a larger existing role, such as `text-display` or `min-h-touch-lg`. Keep colour, type and
spacing definitions in the shared theme.

## Three barriers enforce the contract

- `local/no-token-bypass` rejects native Tailwind colour families, white/black shortcuts, arbitrary hex
  colours and arbitrary text sizes in TypeScript and templates.
- `DesignTokensTest` verifies token publication, front overrides, Material references and WCAG AA contrast
  for the text/background pairs used by screens.
- `MaterialBridge.spec.ts` verifies computed browser styles so a declaration that never reaches the page
  cannot pass on text matching alone.

Dynamic class bindings are outside the lint rule's static reach. Prefer literal role classes. If a computed
binding is required, justify the narrow tooling directive in the commit or MR.

State colours also serve as text on `sunken`; preserve their measured contrast and rerun the token test after
changing any colour.

## Only rendering code depends on the design system

The design system is a shared kernel that depends on no business context. Only primary adapters render and
may depend on it; domain, application and secondary adapters remain independent. `HexagonalArchTest` enforces
both directions.

Composition roots may import the shared visual adapters to assemble their front. The roots are outside the
architecture scan by design; keep business behavior in their front-specific composition or its owning
context, never in the shared chrome.

For Angular Material integration read [`material.md`](material.md). For the icon primitive and drawing set
read [`icons.md`](icons.md).
