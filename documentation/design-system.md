# Design system

## What both fronts share is a set of tokens, not a library of components

`src/main/webapp/styles.css` carries one `@theme` block, and each front composes in Tailwind over it. The two
fronts share no screen, so the demand for shared components is thin; what they do share is the meaning of a
colour — the red of a non-conformity is the same fact on a pupitre tile and in a gestion table, seen by two
people who talk about it on the shop floor. Two values for one role would break that conversation.

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

## Two barriers, both in a tool that already runs

- **`local/no-token-bypass`** (`eslint.config.mjs`), on `src/**/*.ts` and `src/**/*.html`: native Tailwind
  colour families, `bg-white` / `bg-black`, arbitrary hexes, arbitrary text sizes. eslint already parses the
  templates and reports the exact line.
- **`DesignTokensTest`** (`src/test/webapp/unit/`) reads the declared values and measures the contrast of the
  text-on-background pairs the screens really show — `sunken` included, since tables stripe their rows with
  `odd:bg-sunken`, so a `text-ok` cell sits on it one row in two. Every pair clears WCAG AA at 4.5:1.

`ok` and `warn` are deliberately darker than the usual greens and ambers because they are also text in those
cells: measured on `sunken`, `#15803D` fell to 4.26:1 and `#A16207` to 4.19:1. The values in place give
6.06:1 and 5.83:1. **Never lighten a state colour without rerunning that spec.**

The lint rule is blind to dynamic bindings (`[class]`, `ngClass`): it reads class strings, and a computed one
is never a string it sees. The way out is a motivated `eslint-disable-next-line`, which `local/no-comments`
lets through as a tooling directive, with the justification in the commit message as everywhere else. No
folder is exempt — the one place a hexadecimal is legitimate is `styles.css`, which eslint does not read.

---

New rules on this topic go here.
