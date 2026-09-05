# glmfront

## Prerequisites

### Node.js and NPM

Install [Node.js](https://nodejs.org/) 24 or newer, then install the dependencies:

```
npm install
```

## Local environment

<!-- seed4j-needle-localEnvironment -->

## Start up

<!-- seed4j-needle-startupCommand -->

Serve one front at a time:

```bash
npm run dev:gestion # http://localhost:9000
npm run dev:pupitre # http://localhost:9001
```

## Documentation

Conventions, one document per topic:

- [Testing](documentation/testing.md) — the three test layers, naming, what deserves a test and what does
  not
- [Architecture](documentation/architecture.md) — bounded contexts, the rules `arch-unit-ts` enforces, ports
  and adapters
- [Authentication](documentation/authentication.md) — OIDC, device enrolment, credential persistence and
  interceptors
- [API](documentation/api.md) — generated contracts, the typed client, pagination and refusal translation
- [Offline pupitre](documentation/offline-pupitre.md) — durable capture, synchronization, replay and runtime
- [Code style](documentation/code-style.md) — naming, Angular idioms in use, linting and formatting
- [Design system](documentation/design-system.md) — shared role tokens and the barriers against bypasses
- [Material](documentation/material.md) — theme selection and the bridge from Material to project tokens
- [Icons](documentation/icons.md) — the typed, bundled SVG icon set
- [Git and MR](documentation/git-and-mr.md) — branching, commit messages and their granularity, MR
  descriptions

Engineering skill configuration:

- [Issue tracker](docs/agents/issue-tracker.md) — GitHub Issues and the existing Backlog GLM board
- [Triage labels](docs/agents/triage-labels.md) — the five canonical triage roles
- [Domain docs](docs/agents/domain.md) — bounded-context vocabulary and the existing ADR archive

Background and decisions:

- Bounded-context agent docs — [gestion opérateur](src/main/webapp/gestion/contexts/operateur/AGENTS.md)
  and [pupitre atelier](src/main/webapp/pupitre/contexts/atelier/AGENTS.md) own their vocabulary, responsibilities, invariants and local rules
- [Hexagonal architecture](documentation/hexagonal-architecture.md) — the theory behind the layout
- [Architecture Decision Records](documentation/adr/README.md) — structural decisions, the options weighed
  and their price

[AGENTS.md](AGENTS.md) covers what an agent needs before it knows the task: commands, traps, and where
each of these documents applies. Codex reads it directly; [CLAUDE.md](CLAUDE.md) imports it with
`@AGENTS.md` for Claude Code. Maintain shared instructions in `AGENTS.md` and the topic documents so both
tools use the same conventions.

<!-- seed4j-needle-documentation -->
