# Design system

## What both fronts share is a set of tokens, not a library of components

`src/main/webapp/styles.css` carries one `@theme static` block, and each front composes in Tailwind over it.
The two fronts share no screen, so the demand for shared components is thin; what they do share is the meaning
of a colour — the red of a non-conformity is the same fact on a pupitre tile and in a gestion table, seen by
two people who talk about it on the shop floor. Two values for one role would break that conversation.

`static` is load-bearing, not decoration. A plain `@theme` only emits the variables some utility class uses,
and Tailwind scans templates, not stylesheets: half the roles would exist as a class and resolve to nothing in
a `var()`. Anything reading a token outside a utility — the Material bridge below, a component stylesheet —
needs the whole set published.

Colour is named by **role**, never by hue: `canvas`, `surface`, `sunken`, `border`, `border-strong`, `ink`,
`ink-muted`, `accent`, `on-accent`, plus the states `ok`, `nc`, `glm`, `warn`. Typography is six levels, each
carrying its own weight — `display`, `title`, `section`, `body`, `body-sm`, `label` — which is what makes a
seventh heading combination impossible to write. Touch targets are `spacing-touch` (44 px) and
`spacing-touch-lg` (52 px), in px and not rem: a gloved finger is a physical dimension, not a reading
distance.

`--color-glm` is imported **under reserve**. It presupposes that the GLM is a thing with a colour, where the
pupitre screen treats it as a computed residue that "must be seen without existing"; it is re-read when that
is settled.

`--font-sans` is a system stack — no webfont, no third-party request. Until the ticket that ends the external
requests lands, `body` still names Roboto and `gestion/index.html` still links Google Fonts: the token is in
place, the removal is not.

## The one override a front gets is the scale

`src/main/webapp/pupitre/styles.css` holds `html { font-size: 20px }` and nothing else, and sits in the
`styles` array of `build-pupitre` (`angular.json`). The kiosk is read standing, at arm's length, so the
smallest level is what sets the scale: `label` is 12 px on a desktop root and 15 px on the pupitre's. The rem
type scale follows the root, the px touch targets do not, and that asymmetry is the design.

Divergence between the two fronts is a matter of **choosing** a token in the template — `text-display` and
`min-h-touch-lg` at the pupitre, `text-body-sm` in the tables — never of giving a role a second value. Any
colour or role token appearing in a front stylesheet is a violation and not an exception: that is the file
where, otherwise, `--color-nc` will have taken another shade in six months "because we could not see it".
`DesignTokensTest` holds the file to one rule, `html`, with one property.

## Material reads the tokens, it does not hold a copy of them

`gestion` runs Angular Material's **azure-blue** prebuilt theme (`angular.json`, `build-gestion`), which is
Material 3 and therefore expresses everything through `--mat-sys-*` custom properties. That is the whole
reason for the theme: M2's indigo-pink hard-codes its palette into selectors, where M3 leaves a variable to
point somewhere else.
`src/main/webapp/app/shared/design-system/infrastructure/primary/gestion/material-bridge.css` is where it
points — one `:root` block, one line per system token, each of them a bare `var(--color-…)` or `var(--text-…)`.

Pure CSS, deliberately. `mat.theme()` in Sass wants compile-time literals, so it would take a **copy** of the
palette, and a copy drifts: someone changes `--color-accent`, the Material chrome keeps last quarter's blue,
and nothing fails. A `var()` cannot diverge from what it reads. `:root` (0,1,0) also outranks the prebuilt's
`html` (0,0,1), so the bridge wins whatever the order of the `styles` array.

Only the tokens that carry a role are pointed — the twelve colours and the ten typographic levels Material's
components actually consume. The tonal variants below them keep azure-blue's values, and font weight and
letter-spacing stay Material's: the design system has an opinion about _which grey_ and _how big_, not about
the tracking of a chip label. `--mat-sys-on-error` reads `--color-on-accent` on purpose and not by accident:
in this token set `on-accent` is the one foreground for every strong fill, which is why `DesignTokensTest`
measures it on `accent`, `ok`, `nc`, `glm` and `warn` alike.

Two things the bridge deliberately does **not** point.

- **The family.** Every `--mat-sys-*-font` stays Roboto, because `styles.css` still says
  `body { font-family: Roboto … }` and pointing the chrome alone renders the back-office in two typefaces.
  The family is one decision for the whole page; the ten lines land in this file the day the page stops
  naming Roboto, alongside the removal of the Google Fonts link.
- **The composite shorthands.** M3 also ships `--mat-sys-body-large: 400 1rem / 1.5rem Roboto`, which an
  override of the `-size` and `-line-height` parts cannot reach — and cannot be written as a bare `var()`
  either, so the bridge's one-reference-per-line contract excludes it by construction. Only `mat-grid-list`
  reads the shorthands, and gestion has none; the day one appears it will show azure-blue's size, and the
  fix is the same as for any other family that jars — one more line, still a `var()`.

Two consequences of the M2 → M3 move are worth knowing before reading a template. `.mat-typography` no longer
exists, so a heading gets its size from a token class (`text-title`, `text-section`) or from nothing at all —
Tailwind's preflight resets `h1`–`h6` to inherit. And `color="primary"` / `color="accent"` are inert under M3;
they are removed where they were gestion-only, and left on the shared header because `pupitre` still loads
indigo-pink until the ticket that takes Material out of it lands.

## Three barriers, all in a tool that already runs

- **`local/no-token-bypass`** (`eslint.config.mjs`), on `src/**/*.ts` and `src/**/*.html`: native Tailwind
  colour families, `bg-white` / `bg-black`, arbitrary hexes, arbitrary text sizes. eslint already parses the
  templates and reports the exact line.
- **`DesignTokensTest`** (`src/test/webapp/unit/`) reads the declared values and measures the contrast of the
  text-on-background pairs the screens really show — `sunken` included, since tables stripe their rows with
  `odd:bg-sunken`, so a `text-ok` cell sits on it one row in two. Every pair clears WCAG AA at 4.5:1. It also
  holds the theme to `@theme static`, and the bridge to references only — a `--mat-sys-*` given a literal, or
  pointed at a token the theme does not declare, is a red test.
- **`MaterialBridge.spec.ts`** (`src/test/webapp/component/gestion/design-system/`) opens the shell in a
  browser and checks that the Material chrome computes to the same colour the token does. A file read from
  disk proves the intent, not the result: this is the layer that catches a token published nowhere, which a
  text match on a stylesheet cannot see.

`ok` and `warn` are deliberately darker than the usual greens and ambers because they are also text in those
cells: measured on `sunken`, `#15803D` fell to 4.26:1 and `#A16207` to 4.19:1. The values in place give
6.06:1 and 5.83:1. **Never lighten a state colour without rerunning that spec.**

The lint rule is blind to dynamic bindings (`[class]`, `ngClass`): it reads class strings, and a computed one
is never a string it sees. The way out is a motivated `eslint-disable-next-line`, which `local/no-comments`
lets through as a tooling directive, with the justification in the commit message as everywhere else. No
folder is exempt — the one place a hexadecimal is legitimate is `styles.css`, which eslint does not read.

---

New rules on this topic go here.
