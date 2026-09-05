# Domain docs

Each bounded context owns its vocabulary, responsibilities, invariants and local rules in its own
`AGENTS.md`. System-wide decisions remain in `documentation/adr/`. The root agent document routes work but
does not own business language.

## Before exploring

- Identify the bounded context that owns the work and read its nearest `AGENTS.md`.
- Read the [ADR index](../../documentation/adr/README.md), then decisions relevant to the work.
  Use the index for current statuses.
- Read the topic rules routed from [AGENTS.md](../../AGENTS.md) for the changes being considered.

When no bounded context can be identified, proceed without creating business documentation or adding
business material to the root `AGENTS.md`. A context map is optional and is not required for discovery.

## Vocabulary and decisions

Use the bounded context's canonical terms in domain type names, issue titles, proposals, hypotheses and test names.
Name a model for the business concept it owns; keep its framework or orchestration role in the technical
adapter's name. Reconsider unrecognized synonyms; record a real terminology gap for `domain-modeling` when
one remains.

Surface a proposal's conflict with an existing ADR and explain why reopening the decision is warranted.
For a new ADR, use `documentation/adr/` and its existing index, numbering and template conventions.
This repository-specific location takes precedence over the engineering skills' default `docs/adr/` path.

The engineering skill configuration lives in `docs/agents/` because the skills discover it there.
Topic documentation and ADRs continue to live under `documentation/`.
