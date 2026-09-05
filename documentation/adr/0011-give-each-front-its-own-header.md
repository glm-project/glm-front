# 0011 — Give each front its own header

## Status

Accepted.

## Context

Issue #48 originally proposed a shared tokenized toolbar. Its design review established that gestion and
pupitre need independent chrome: Material navigation and session actions for gestion, passive connectivity
and kiosk sizing for pupitre.

## Considered options

- Independent front components — **kept**.
- Shared Angular toolbar with slots — rejected: couples layout and ergonomics without shared behavior.
- Shared CSS toolbar — rejected: retains the same visual coupling under another interface.

## Decision

Let each composition root own its header markup, styles and tests. Keep Material in gestion and render the
pupitre header with shared design tokens. Share tokens and visual primitives only where their contract is
actually common.

## Consequences

### Positive

- Pupitre no longer imports Material through its header or loads a Material theme.
- Each front can evolve its chrome without changing the other front's layout or slots.

### Negative

- Similar title and spacing markup exists in both headers and is maintained independently.
