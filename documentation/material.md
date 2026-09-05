# Angular Material

Angular Material consumes project roles through a CSS bridge; it does not own a second palette.

## Each front selects its current theme

`gestion` loads the Material 3 `azure-blue` prebuilt theme, followed by
`app/shared/design-system/infrastructure/primary/gestion/material-bridge.css`. `pupitre` still loads the
Material 2 `indigo-pink` prebuilt theme and no bridge.

Keep that asymmetry explicit in `angular.json`. Removing Material from pupitre or moving it to Material 3 is
a separate change with its own visual verification.

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
tokens and project role utilities. The shared toolbar retains `color="primary"` only because pupitre still
renders it under the M2 theme.

Tailwind preflight resets heading elements to inherit. Give headings an explicit project typography role;
`.mat-typography` is not the source of page hierarchy.

## Verify intent and computed result

`DesignTokensTest` checks that every bridge declaration references a declared project token.
`MaterialBridge.spec.ts` opens gestion and compares computed Material colours with the project roles. Run both
after changing the theme, bridge or a shared token used by Material.

Use [`icons.md`](icons.md) for glyphs inside Material controls. Do not reintroduce the Material Icons font.
