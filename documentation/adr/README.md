# Architecture Decision Records

Structural decisions taken on this repository, with the options weighed and the price paid. Copy
[`template.md`](template.md) to start one; number it with the next free 4-digit prefix followed by a
kebab-case title (`0002-something-decided.md`). If two branches take the same number, the later MR
renumbers at merge time. The status below is the living one — update this line when a record changes state.

- [0001 — Documentation layout](0001-documentation-layout.md) — **Amended by 0010 and 0012** — minimal agent entry
  point, topic documents and local ADRs
- [0002 — Port contract for secondary adapters](0002-port-contract-for-secondary-adapters.md) — **Amended by 0012** —
  one suite per port run against every adapter, fakes replace the external system
- [0003 — Hand-written device grant for the pupitre](0003-hand-written-device-grant-for-the-pupitre.md) —
  **Amended by 0007** — RFC 8628 behind the port; device credentials now survive restart
- [0004 — ngsw caches the pupitre shell and nothing else](0004-ngsw-caches-the-pupitre-shell-and-nothing-else.md) —
  **Complemented by 0007** — assetGroups only, pupitre only and no API-response caching; durable writes live
  in the application journal
- [0005 — Draw icons from an SVG the bundle carries](0005-icons-as-svg-the-bundle-carries.md) — **Accepted** —
  `glm-icon` over `@ng-icons`, one typed set, no icon font and no CDN link
- [0006 — Call the back through a typed client](0006-how-the-front-calls-the-back.md) — **Amended by 0007** — a
  typed client and adapter translation, with complete offline reads and aggregate rereads added later
- [0007 — Persist the pupitre before acknowledging a gesture](0007-durable-offline-pupitre.md) — **Accepted** —
  IndexedDB, company partitions, a durable FIFO, complete reference activation between operator windows
- [0008 — Extract methods to expose intent](0008-extract-methods-to-expose-intent.md) — **Accepted** —
  named cohesive steps when long methods, nested logic or callbacks obscure the workflow
- [0009 — Give operator windows and replay rules a domain owner](0009-pupitre-domain-responsibilities.md) — **Complemented by 0013** —
  window and replay rules in `domain`, separate capture and exchange orchestration, company journal port
- [0010 — Route agent documentation by change](0010-route-agent-documentation-by-change.md) — **Accepted** —
  branch-specific topic documents, environment-owned inventories and an executable index/link contract
- [0011 — Give each front its own header](0011-give-each-front-its-own-header.md) — **Accepted** —
  independent front chrome, Material confined to gestion
- [0012 — Give each front ownership of its business contexts](0012-own-business-contexts-by-front.md) — **Accepted** —
  application-owned contexts, technical-only shared code and local bounded-context language
- [0013 — Keep business decisions in rich domain models](0013-keep-business-decisions-in-rich-domain-models.md) — **Accepted** —
  domain-owned interaction and lifecycle rules, application coordination and behavioral contracts
- [0014 — Resolve architecture dependencies through the compiler](0014-resolve-architecture-dependencies-through-the-compiler.md) —
  **Accepted** — exhaustive boundary discovery, re-export resolution and symbol-aware domain environment checks
- [0015 — Pin every validation input](0015-pin-every-validation-input.md) — **Accepted** — exact Node/npm,
  lockfile-only installs and an immutable backend contract revision in local validation and CI
- [0017 — Use one validation graph at every gate](0017-use-one-validation-graph-at-every-gate.md) — **Amended by 0020** —
  shared commands for Git, Codex and CI, with pinned security tools and bounded completion validation
- [0018 — Run replay mutation through Angular](0018-run-replay-mutation-through-angular.md) — **Accepted** —
  bounded replay-policy mutation through the Angular builder, checked invalid mutants and a scheduled report
- [0019 — Enforce SonarJS rules through ESLint](0019-enforce-sonarjs-rules.md) — **Accepted** — recommended static
  analysis with a cognitive-complexity ceiling of 7 and narrow TypeScript exclusions
- [0020 — Keep pre-push feedback quick](0020-keep-pre-push-feedback-quick.md) — **Accepted** — quick static checks
  at push, with the complete graph retained by Codex Stop and CI
