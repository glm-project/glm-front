# 0027 — Encode the enrolment QR code in the bundle

## Status

Accepted. Complements [ADR 0005](0005-icons-as-svg-the-bundle-carries.md) and
[ADR 0026](0026-enrol-pupitre-screen-and-keycloak-delegation.md).

## Context

The enrolment screen shows a QR code carrying the Keycloak verification URI so a supervisor validates the
pupitre from a phone without retyping the code. The pupitre is a boot document that ships everything it needs:
`ExternalRequestsTest` rejects absolute and protocol-relative external origins, and the service worker caches
only the shell. A remote image service is therefore not an option, and a pupitre with no network at the moment
it must be enrolled would show nothing.

Encoding a QR code is Reed–Solomon error correction plus a specified module layout. It is a solved,
standardised problem with an exact expected output, not a place for a hand-written implementation.

## Considered options

- Depend on `qrcode-generator` and draw its modules ourselves — **kept**.
- Call a QR image service — rejected: an external origin, unavailable exactly when a pupitre has no network yet.
- Write the encoder in the repository — rejected: Reed–Solomon coding and mask selection carry no product value
  and a defect would be silent until a phone fails to scan.
- Use the library's `createSvgTag()` output — rejected: injecting markup would need `innerHTML` and a sanitizer
  decision for a value we can render as one `<path>`.
- Use a heavier library rendering to canvas — rejected: a raster image does not scale with the kiosk zoom and
  cannot take its colours from the design tokens.

## Decision

Depend on `qrcode-generator`, pinned exactly, MIT-licensed and with no transitive dependency. Use it only to
compute the module matrix.

Keep the rendering in the repository. `glm-qr-code` derives a single SVG path from the matrix and renders it in
an inline `<svg>`, with no `innerHTML` and no `DomSanitizer`. Its colours come from `var(--color-ink)` and
`var(--color-surface)` in the component stylesheet, so the code follows the design tokens like every other
surface.

Keep the component in the enrolment context's primary adapters. One screen uses it; promote it to the design
system only when a second consumer exists.

## Consequences

### Positive

- A pupitre with no prior network still displays a scannable code, offline-capable by construction.
- The rendered code is vector, scales with the kiosk root font size and honours the colour roles.
- No sanitizer decision and no injected markup on a screen reached before any credential exists.

### Negative

- One more runtime dependency in the pupitre bundle, updated by us rather than by a platform.
- The module-to-path projection is our code, so a rendering defect is ours even though the encoding is not.
- The library exposes a global `qrcode` declaration through its typings; we import the module and do not use
  that global.
