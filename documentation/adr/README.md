# Architecture Decision Records

Structural decisions taken on this repository, with the options weighed and the price paid. Copy
[`template.md`](template.md) to start one; number it with the next free 4-digit prefix followed by a
kebab-case title (`0002-something-decided.md`). If two branches take the same number, the later MR
renumbers at merge time.

**A record's own `## Status` is the living one.** Most records are reached from a topic document or a
context's `AGENTS.md`, never through this index, so a status kept only here would not reach their readers. A
`## Status` states what still holds and what a later record changed, in enough words that the reader does not
have to open that later record. This index carries titles and hooks, and marks the records that have been
superseded — those are the ones not to open.

- [0001 — Documentation layout](0001-documentation-layout.md) — minimal agent entry point, topic documents
  and local ADRs
- [0002 — Port contract for secondary adapters](0002-port-contract-for-secondary-adapters.md) — one suite per
  port run against every adapter, fakes replace the external system
- [0003 — Hand-written device grant for the pupitre](0003-hand-written-device-grant-for-the-pupitre.md) —
  RFC 8628 behind the port; device credentials survive restart
- [0004 — ngsw caches the pupitre shell and nothing else](0004-ngsw-caches-the-pupitre-shell-and-nothing-else.md) —
  assetGroups only, pupitre only and no API-response caching; durable writes live in the application journal
- [0005 — Draw icons from an SVG the bundle carries](0005-icons-as-svg-the-bundle-carries.md) — `glm-icon`
  over `@ng-icons`, one typed set, no icon font and no CDN link
- [0006 — Call the back through a typed client](0006-how-the-front-calls-the-back.md) — a typed client and
  adapter translation, with complete offline reads and aggregate rereads added later
- [0007 — Persist the pupitre before acknowledging a gesture](0007-durable-offline-pupitre.md) — IndexedDB,
  company partitions, a durable FIFO, complete reference activation between operator windows
- [0008 — Extract methods to expose intent](0008-extract-methods-to-expose-intent.md) — named cohesive steps
  when long methods, nested logic or callbacks obscure the workflow
- [0009 — Give operator windows and replay rules a domain owner](0009-pupitre-domain-responsibilities.md) —
  window and replay rules in `domain`, separate capture and exchange orchestration, company journal port
- [0010 — Route agent documentation by change](0010-route-agent-documentation-by-change.md) —
  branch-specific topic documents, environment-owned inventories and an executable index/link contract
- [0011 — Give each front its own header](0011-give-each-front-its-own-header.md) — independent front chrome,
  Material confined to gestion
- [0012 — Give each front ownership of its business contexts](0012-own-business-contexts-by-front.md) —
  application-owned contexts, technical-only shared code and local bounded-context language
- [0013 — Keep business decisions in rich domain models](0013-keep-business-decisions-in-rich-domain-models.md) —
  domain-owned interaction and lifecycle rules, application coordination and behavioral contracts
- [0014 — Resolve architecture dependencies through the compiler](0014-resolve-architecture-dependencies-through-the-compiler.md) —
  exhaustive boundary discovery, re-export resolution and symbol-aware domain environment checks
- [0015 — Pin every validation input](0015-pin-every-validation-input.md) — exact Node/npm, lockfile-only
  installs and an immutable backend contract revision in local validation and CI
- [0017 — Use one validation graph at every gate](0017-use-one-validation-graph-at-every-gate.md) — shared
  validation commands and pinned security tools
- [0018 — Run replay mutation through Angular](0018-run-replay-mutation-through-angular.md) —
  **superseded by 0024** — initial bounded replay-policy mutation through the Angular builder
- [0019 — Enforce SonarJS rules through ESLint](0019-enforce-sonarjs-rules.md) — recommended static analysis
  with a cognitive-complexity ceiling of 7 and narrow TypeScript exclusions
- [0020 — Keep pre-push feedback quick](0020-keep-pre-push-feedback-quick.md) — **superseded by 0024** —
  quick static checks at push instead of the complete graph
- [0021 — Own immutable domain contracts](0021-own-immutable-domain-contracts.md) — stateful invariants and
  pure domain policies, immutable public snapshots and exclusive journal event states
- [0022 — Keep conventions contextual and enforceable](0022-keep-conventions-contextual-and-enforceable.md) —
  contextual readability rules and a narrowly scoped presentation-effect exception
- [0023 — Stop overloaded coordinators at lint](0023-stop-overloaded-coordinators-at-lint.md) — a conjunctive
  production tripwire for stateful coordinators, with responsibility review at the enforcement point
- [0024 — Extend mutation to the unit-tested project](0024-extend-mutation-to-the-unit-tested-project.md) —
  100 % mutation score enforced on changed domain core, informational outside domain; owns the whole pre-push gate
- [0025 — Route runtime errors through ErrorHandlerPort](0025-route-runtime-errors-through-error-handler-port.md) —
  a shared technical port for unhandled asynchronous errors across application coordinators and authentication adapters
- [0026 — Show the pupitre enrolment and delegate its approval to Keycloak](0026-enrol-pupitre-screen-and-keycloak-delegation.md) —
  an enrolment context and screen, an exposed grant lifecycle, derived expiry and a guarded reset gesture
- [0027 — Encode the enrolment QR code in the bundle](0027-encode-the-enrolment-qr-code-in-the-bundle.md) —
  a pinned encoder, our own SVG path rendering and design-token colours, with no external origin
- [0028 — Default to Value Objects for domain values](0028-default-to-value-objects-for-domain-values.md) —
  Value Objects for meaningful scalar and composite values and business collections, including single-use concepts
- [0029 — Name compound if predicates](0029-name-compound-if-predicates.md) — a deterministic
  single-criterion limit for `if` conditions, with named predicates placed by responsibility
- [0030 — Shape scenarios at lint](0030-shape-scenarios-at-lint.md) — branchless scenarios everywhere and, on
  domain specs, nothing acting after the first assertion
