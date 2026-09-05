# Angular Material

Angular Material consumes project roles through a CSS bridge; it does not own a second palette.

## Gestion owns Material

`gestion` loads the Material 3 `azure-blue` prebuilt theme, followed by
`gestion/shared/design-system/infrastructure/primary/material-bridge.css`. Pupitre owns a Material-free
header and loads no Material theme.

Keep Material imports in gestion rendering code so pupitre remains independent of its theme and runtime.

## The gestion bridge references shared tokens

The bridge contains one `:root` block. Every overridden `--mat-sys-*` value is a bare reference to an
existing `--color-*` or `--text-*` token. Put no literal palette or type size there: changing the shared role
must change Material in the same edit.

The bridge maps twelve Material system colour properties to the thirteen project roles; not every project
state is a Material theme role. It maps size and line-height for the ten Material typography levels currently
used. Material keeps its font weight and letter spacing.

Material font-family properties and composite typography shorthands are not bridged. The page already uses a
system stack, but the prebuilt themes retain Roboto in their own variables. Treat removal of that remaining
fallback as one page-wide typography change, verified in the browser.

## M3 attributes are not M2 palette switches

Under Material 3, `color="primary"` and `color="accent"` do not select M2 palettes. Use the bridged system
tokens and project role utilities. Gestion retains its toolbar's `color="primary"` attribute for continuity;
it does not provide an M2 primary background under its M3 theme.

Tailwind preflight resets heading elements to inherit. Give headings an explicit project typography role;
`.mat-typography` is not the source of page hierarchy.

## Verify intent and computed result

`DesignTokensTest` checks that every bridge declaration references a declared project token.
`MaterialBridge.spec.ts` opens gestion and compares computed Material colours with the project roles. Run both
after changing the theme, bridge or a shared token used by Material.

Use [`icons.md`](icons.md) for glyphs inside Material controls. Do not reintroduce the Material Icons font.
