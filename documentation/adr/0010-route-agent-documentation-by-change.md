# 0010 — Route agent documentation by change

## Status

Accepted.

## Context

ADR 0001 moved conventions out of the always-loaded agent file, but `architecture.md` grew to 3,548 words
covering composition, authentication, API translation and offline replay. `design-system.md` similarly mixed
shared roles, Material internals and icons. A change on one branch loaded every other branch.

Current-state inventories also drifted. The agent file copied an obsolete CI sequence and named a removed
coverage file; architecture listed only the first two contexts; README and the design-system document
disagreed on the number of enforcement barriers. The code and configuration remained authoritative, but the
documentation presented its copies as facts.

## Considered options

- Route branch-specific topic documents from `AGENTS.md` — **kept**: each change loads its operational rules
  without unrelated implementation history.
- Keep the existing topic files and shorten their paragraphs — rejected: authentication, API, offline,
  Material and icons still have distinct triggers, so compact prose would preserve the wrong hierarchy.
- Generate all documentation from code — rejected: tools can expose inventories, but conventions, traps and
  rationale require authored prose.
- Rely on review to synchronize the indexes — rejected: ADR 0001 named this risk and the drift occurred.

## Decision

`AGENTS.md` remains the always-loaded entry point. Its routing table names each change branch explicitly:
architecture, authentication, API integration, offline pupitre, code style, design system, Material, icons,
testing, Git/MR and ADRs.

`architecture.md` keeps only shared structural rules and routes specialized work onward.
`design-system.md` keeps shared visual roles and enforcement. Authentication, API/offline behavior, Material
and icons each have their own topic document.

Configuration owns inventories and current state. Agent documentation may cache commands only when their
invocation is non-obvious or a wrong invocation is costly. CI steps stay in the workflow, dependency versions
in `package.json`, and current context membership in the source tree.

`README.md` remains the human index. `AGENTS.md` remains the trigger index. `npm run test:documentation`
checks that both name the same routed topic documents and that every local Markdown link resolves.

## Consequences

### Positive

- Each task loads only the rules for its branch; architecture and styling changes no longer pay for every
  integration detail.
- Inventories have one source of truth, reducing stale copies in permanent context.
- A missing topic link or index entry fails locally and in CI through the lint script.

### Negative

- The documentation folder contains more files, so humans rely more heavily on README as its index.
- One change can legitimately require several topic documents; the routing table must keep those triggers
  distinct rather than compressing them into a vague pointer.
- The executable check proves links and index membership, not factual accuracy inside prose. Review still
  removes stale claims when behavior changes.
