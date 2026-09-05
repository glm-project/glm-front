# Architecture Decision Records

Structural decisions taken on this repository, with the options weighed and the price paid. Copy
[`template.md`](template.md) to start one; number it with the next free 4-digit prefix followed by a
kebab-case title (`0002-something-decided.md`). If two branches take the same number, the later MR
renumbers at merge time. The status below is the living one — update this line when a record changes state.

- [0001 — Documentation layout](0001-documentation-layout.md) — **Amended by 0010** — minimal agent entry
  point, topic documents and local ADRs
- [0002 — Port contract for secondary adapters](0002-port-contract-for-secondary-adapters.md) — **Accepted** —
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
- [0009 — Give operator windows and replay rules a domain owner](0009-pupitre-domain-responsibilities.md) — **Accepted** —
  window and replay rules in `domain`, separate capture and exchange orchestration, company journal port
- [0010 — Route agent documentation by change](0010-route-agent-documentation-by-change.md) — **Accepted** —
  branch-specific topic documents, environment-owned inventories and an executable index/link contract
