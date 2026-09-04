# glmfront

## Prerequisites

### Node.js and NPM

Before you can build this project, you must install and configure the following dependencies on your machine:

[Node.js](https://nodejs.org/): We use Node to run a development web server and build the project.
Depending on your system, you can install Node either from source or as a pre-packaged bundle.

After installing Node, you should be able to run the following command to install development tools.
You will only need to run this command when dependencies change in [package.json](package.json).

```
npm install
```

## Local environment

<!-- seed4j-needle-localEnvironment -->

## Start up

<!-- seed4j-needle-startupCommand -->

## Documentation

Conventions, one document per topic:

- [Testing](documentation/testing.md) — the three test layers, naming, what deserves a test and what does
  not
- [Architecture](documentation/architecture.md) — bounded contexts, the rules `arch-unit-ts` enforces, ports
  and adapters, Keycloak wiring
- [Code style](documentation/code-style.md) — naming, Angular idioms in use, linting and formatting
- [Design system](documentation/design-system.md) — the shared tokens, the one per-front override, and the
  two barriers that keep them from being bypassed
- [Git and MR](documentation/git-and-mr.md) — branching, commit messages and their granularity, MR
  descriptions

Background and decisions:

- [Hexagonal architecture](documentation/hexagonal-architecture.md) — the theory behind the layout
- [Architecture Decision Records](documentation/adr/README.md) — structural decisions, the options weighed
  and their price

`CLAUDE.md` covers what an agent needs before it knows the task: commands, traps, and where each of these
documents applies.

<!-- seed4j-needle-documentation -->
