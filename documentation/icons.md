# Icons

Draw icons through the typed `glm-icon` primitive at
`app/shared/design-system/infrastructure/primary/icon/`.

## One declaration owns names and drawings

`DRAWINGS` maps each allowed name to its bundled SVG. `IconName` is `keyof typeof DRAWINGS`, and the same
object is passed to `provideIcons`. Add a drawing and its public name in that one declaration; an unknown name
must remain a compile error rather than a blank runtime glyph.

`@ng-icons/core` and `@ng-icons/lucide` are pinned to the line compatible with Angular 21. Check their Angular
peer range as part of an upgrade instead of moving the packages independently.

## Size and accessibility belong to the control

The glyph uses `1em` and `currentColor`, inheriting visual size and colour from its owner. Name a project
typography or colour role on the surrounding control when needed.

Inside a Material icon button, let Material's icon-button size own the SVG. The control carries the accessible
name; decorative `NgIcon` content stays hidden from assistive technology.

Use `glm-icon`, never a hand-written `<mat-icon>name</mat-icon>` ligature. The project ships no Material Icons
font, so a ligature renders as its text. Boot documents also make no third-party font request.

[ADR 0005](adr/0005-icons-as-svg-the-bundle-carries.md) records the bundled SVG decision and its dependency
cost.
