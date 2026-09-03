# Architecture Decision Records

Structural decisions taken on this repository, with the options weighed and the price paid. Copy
[`template.md`](template.md) to start one; number it with the next free 4-digit prefix followed by a
kebab-case title (`0002-something-decided.md`). If two branches take the same number, the later MR
renumbers at merge time. The status below is the living one — update this line when a record changes state.

- [0001 — Documentation layout](0001-documentation-layout.md) — **Accepted** — minimal CLAUDE.md, topic docs
  under documentation/, local ADRs
- [0002 — Port contract for secondary adapters](0002-port-contract-for-secondary-adapters.md) — **Accepted** —
  one suite per port run against every adapter, fakes replace the external system
