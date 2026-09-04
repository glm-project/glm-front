# 0005 — Draw icons from an SVG the bundle carries

## Status

Accepted

## Context

`gestion/index.html` linked two stylesheets on `fonts.googleapis.com`, Roboto and Material Icons, each with a
`//NOSONAR` beside it because no `integrity` attribute can pin a stylesheet whose bytes the CDN chooses at
request time. Two facts follow: a supply chain nobody can verify, and every user's IP address handed to a
third party on each load. The pupitre settles it alone — it is offline-first, runs on a shop floor where a
remote stylesheet is a render it cannot make, and can therefore depend on no external request at all.

The only icon in the tree was one `<mat-icon>menu</mat-icon>` on the gestion menu trigger. Material does not
ship the font: it puts `.material-icons` on the element from `_defaultFontSetClass`, and the CDN `<link>` is
what supplied the class. Removing the link kills hand-written ligatures and nothing else.

An icon set is also a design-system concern before it is a rendering one. `<mat-icon>menu</mat-icon>` takes a
free string: a name that exists nowhere is a silent blank at runtime, and nothing ties the set a designer
agreed to the set a template may use.

## Considered options

- `@ng-icons/core` + `@ng-icons/lucide` behind a `glm-icon` primitive — **kept**.
- Keep the Material Icons font, self-hosted — rejected: it trades the third party for ~140 kB of glyphs to
  ship one of, and leaves the name a free string.
- Inline each SVG by hand in the template — rejected: no set, no type, and the same drawing duplicated at
  every call site.
- `@angular/material`'s `MatIconRegistry` with registered SVG literals — rejected: it keeps the whole icon
  module for a registry, and its names stay strings resolved at runtime.

## Decision

A front draws an icon with `glm-icon`
(`app/shared/design-system/infrastructure/primary/icon/`), never with an icon font.

The set is one object, `DRAWINGS`, which is at once the argument to `provideIcons` and — through
`keyof typeof` — the type of the `name` input. Adding a name without its drawing does not compile, so the two
cannot drift apart. The glyph sizes itself at `1em` and paints in `currentColor`, taking both from whatever
encloses it.

`fonts.googleapis.com` and `fonts.gstatic.com` leave both boot documents, and `ExternalRequestsTest` holds
them out.

## Consequences

### Positive

- No third-party request at boot on either front, so nothing to pin and no IP address to leak; the pupitre's
  offline-first constraint is met by construction rather than by discipline.
- Only the drawings actually named reach the bundle. Measured on `build-gestion`: 551.16 kB before,
  535.39 kB after — dropping `MatIconModule` more than pays for `@ng-icons`.
- An icon name the design system does not carry is a compile error, not a blank square.

### Negative

- **Two new runtime dependencies**, and `@ng-icons/core` peers on `@angular-devkit/schematics` and
  `@schematics/angular`, which promotes about thirty packages out of `dev` in `package-lock.json`. `npm ci`
  without `--omit=dev` — which is what CI runs — installs them either way, so nothing changes today; an
  install that ever does omit dev pays for the schematics chain in production.
- **`<mat-icon>foo</mat-icon>` now renders the word `foo`.** Nothing fails at build time and no test catches
  a new one; only reading the screen does.
- The pin is exact at `34.0.0` because `35` raises its `@angular/core` peer floor to 22. Upgrading Angular
  and upgrading icons are now one move, not two.
- Every new icon is a hand edit to `DRAWINGS` — deliberate, and the cost of the compile-time guarantee.
- Nothing here touches `indigo-pink.css`, still on both build targets and still naming `Roboto` in its own
  tokens. Material surfaces therefore ask for a font that no longer loads until the prebuilt theme goes.
