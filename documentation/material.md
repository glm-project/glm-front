# Angular Material

Angular Material consumes project roles through a CSS bridge; it does not own a second palette.

## Gestion owns Material

`gestion` loads the Material 3 `azure-blue` prebuilt theme, followed by
`gestion/shared/design-system/infrastructure/primary/material-bridge.css`, then `surfaces.css` beside it.
Pupitre owns a Material-free header and loads no Material theme.

Keep Material imports in gestion rendering code so pupitre remains independent of its theme and runtime.

## The gestion bridge references shared tokens

The bridge contains one `:root` block. Every overridden `--mat-sys-*` value is a bare reference to an
existing `--color-*`, `--text-*`, `--font-*` or `--radius-*` token. Put no literal palette, type size or
radius there: changing the shared role must change Material in the same edit.

The bridge maps twelve Material system colour properties to the thirteen project roles; not every project
state is a Material theme role. It maps size and line-height for the ten Material typography levels currently
used. Material keeps its font weight and letter spacing.

The fifteen `--mat-sys-*-font` families point at `--font-sans`: the prebuilt theme names Roboto, which boot
documents never load, and Material text fell back to the browser serif. Composite typography shorthands stay
unbridged; no gestion component reads them. The extra-large corner (dialogs) points at `--radius-surface`,
and the button container shapes at `--radius-control`, so a Material button and a hand-made control share
one silhouette.

## M3 attributes are not M2 palette switches

Under Material 3, `color="primary"` and `color="accent"` do not select M2 palettes. Use the bridged system
tokens and project role utilities.

Tailwind preflight resets heading elements to inherit. Give headings an explicit project typography role;
`.mat-typography` is not the source of page hierarchy.

## Verify intent and computed result

`DesignTokensTest` checks that every bridge declaration references a declared project token.
`MaterialBridge.spec.ts` opens gestion and compares computed Material colours with the project roles. Run both
after changing the theme, bridge or a shared token used by Material.

Use [`icons.md`](icons.md) for glyphs inside Material controls. Do not reintroduce the Material Icons font.
