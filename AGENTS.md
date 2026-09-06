# AGENTS.md

`glmfront` is an Angular 21 repository. It contains two independent applications: `gestion`, the workshop back office, and `pupitre`, the shop-floor console. Each owns its bounded contexts and application-specific technical code. `gestion` authenticates with Keycloak through OIDC. `arch-unit-ts` enforces the boundaries.

## Commands

Keep only the common and non-obvious entry points here; `package.json` is the source for the complete script inventory.

```bash
npm run dev:gestion        # http://localhost:9000
npm run dev:pupitre        # http://localhost:9001; serve only one front at a time
npm run build              # production build of both fronts

ng test --watch=false
ng test --watch=false --include 'src/main/webapp/pupitre/**/*.spec.ts'
ng test --watch=false --filter 'Pupitre shell'
npm run test:coverage -- --watch=false
npm run test:component
npm run test:application
npm run test:production-offline # production pupitre + real Chrome service worker; owns ports 9010, 9011 and 9080

npm run lint
npm run prettier:check
npm run typecheck
npm run typecheck:watch
npm run api:generate       # requires authenticated `gh`
npm run validate:quick
npm run validate:complete  # coverage, builds, then serial browser suites
```

## Traps that cost

- Serve one front at a time. Both dev servers share one Vite cache and overwrite each other's optimized modules. `npm run watch` is safe because the build watcher does not use that cache.
- Use the npm scripts for builds and servers. Plain `ng build` and `ng serve` have no target; the repository exposes `build-gestion`, `build-pupitre`, `serve-gestion` and `serve-pupitre` through scripts.
- Keep business contexts in `src/main/webapp/{gestion,pupitre}/contexts/`, application-specific technical code in each front's `shared/`, and genuinely common technical code in `app/shared/`. The applications never import or communicate with one another.
- Create `package-info.ts` before code in a new bounded context so `arch-unit-ts` discovers it. `app/generated/` deliberately has none, preventing domain code from importing wire types.
- Create the bounded context's `AGENTS.md` and a sibling `CLAUDE.md` containing only `@AGENTS.md` before code; keep vocabulary, responsibilities, invariants and local rules with their owner.
- Treat `HexagonalArchTest.spec.ts` failures as architecture failures; fix the dependency instead of weakening the test.
- Let `httpAuthInterceptor` attach bearer tokens. Device-enrolment traffic is the exception and uses `HttpBackend` to bypass interceptors.
- Apply Tidy First to every change: when a behavior-preserving structural cleanup helps, isolate it in a preceding `refactor:` or `chore:` commit; keep behavioral work in a separate commit. Do not add speculative cleanup.

## Verification before claiming done

Nothing is green, validated or done until the relevant command exits with code 0. Report an environmental block explicitly; never simulate success.

The workflow in `.github/workflows/github-actions.yml` is the source of truth for CI. Before a code or dependency PR, run its local equivalents: API generation, lint, Prettier check, TypeScript, coverage, component tests and application tests. For a documentation-only change, run the documentation check, lint and Prettier check.

## Where the rules are

- Tests: before writing, changing or reviewing tests → `documentation/testing.md`
- Architecture: before designing or reviewing a model, component or service, or changing a context, composition root, dependency boundary, port or adapter → `documentation/architecture.md`
- Authentication: before changing OIDC, device enrolment, credentials or auth interceptors → `documentation/authentication.md`
- API: before changing API generation, an HTTP adapter, pagination or refusal translation → `documentation/api.md`
- Offline pupitre: before changing local storage, synchronization, replay or its runtime → `documentation/offline-pupitre.md`
- Code style: before writing or refactoring TypeScript or templates → `documentation/code-style.md`
- Design system: before choosing classes, tokens, colours, typography or touch sizes → `documentation/design-system.md`
- Material: before changing a Material theme, component or token bridge → `documentation/material.md`
- Icons: before adding or changing an icon → `documentation/icons.md`
- Git and MR: before branching, committing or opening an MR → `documentation/git-and-mr.md`
- Validation: before changing hooks, CI checks, security scans or validation commands → `documentation/validation.md`
- ADRs: before introducing a dependency, pattern or convention → `documentation/adr/README.md`
- Issue tracker: before creating, reading or organizing issues → `docs/agents/issue-tracker.md`
- Triage labels: before triaging or applying readiness labels → `docs/agents/triage-labels.md`
- Domain docs: before domain modeling, including naming, or engineering-skill exploration → `docs/agents/domain.md`

## Maintaining agent documentation

Keep a rule here only when it prevents a costly mistake before the task is known. Put branch-specific rules behind the pointers above. The code, configuration and workflows are the source for inventories and current state; document only the convention or trap they do not explain.

Every new topic document appears in both the README documentation index and the routing table above. `npm run test:documentation` checks that contract and all local Markdown links.
