# Domain docs

Use a single-context documentation layout for this repository: one root `CONTEXT.md` glossary and the
existing `documentation/adr/` archive, shared by both fronts and their bounded contexts. This describes
the documentation layout, not the number of domain contexts in the application.

## Before exploring

- Read the root `CONTEXT.md` when it exists.
- Read the [ADR index](../../documentation/adr/README.md), then decisions relevant to the work.
  Use the index for current statuses.
- Read the topic rules routed from [AGENTS.md](../../AGENTS.md) for the changes being considered.

If `CONTEXT.md` is absent, proceed silently. Create it through `domain-modeling` only when a domain term
has been resolved; keep it a glossary rather than a spec or implementation plan.

## Vocabulary and decisions

Use the glossary's canonical terms in issue titles, proposals, hypotheses and test names. Reconsider
unrecognized synonyms; record a real terminology gap for `domain-modeling` when one remains.

Surface a proposal's conflict with an existing ADR and explain why reopening the decision is warranted.
For a new ADR, use `documentation/adr/` and its existing index, numbering and template conventions.
This repository-specific location takes precedence over the engineering skills' default `docs/adr/` path.

The engineering skill configuration lives in `docs/agents/` because the skills discover it there.
Topic documentation and ADRs continue to live under `documentation/`.
