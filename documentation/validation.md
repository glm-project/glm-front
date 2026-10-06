# Validation

## One command graph

`package.json` owns the validation graph used by local hooks and CI. `npm run validate:quick` verifies the
pinned runtime, generates the pinned API contract, then runs lint, formatting, TypeScript and workflow checks.
`npm run validate:complete` adds security reports, coverage, both production builds, component tests,
application tests and the production offline restart. The browser groups run in sequence so their Angular
servers never share one workspace at the same time.

CI invokes the same grouped commands in separate workspaces. Each job records its duration as an artifact.

No pre-push hook is registered and CI runs no mutation, so nothing checks a push before CI unless you do.
Before pushing, run `npm run validate:quick`. When the commits you are about to push add or modify
handwritten domain TypeScript, also mutate those lines, and only those:

```bash
printf 'HEAD %s HEAD %040d\n' "$(git rev-parse HEAD)" 0 | npm run test:mutation:diff -- origin
```

`test:mutation:diff` reads ref lines in the pre-push format on standard input. The zero remote object id is
what Git gives a pre-push hook for a ref the remote lacks: the script then mutates the changed domain lines of
the commits that no `origin` ref contains yet, and fails below the 100 % threshold. Lines already pushed were
checked before their own push, so the rest of the branch is not mutated again. Fetch first so the `origin`
refs are current; after a rebase, every rewritten commit counts as unpushed. Without a mutable domain line it prints
`No changed domain TypeScript files to mutate.` and exits 0. Neither command reruns coverage, builds or
browser suites, which the CI jobs own. The complete local graph runs on explicit invocation with
`npm run validate:complete`. See [ADR 0024](adr/0024-extend-mutation-to-the-unit-tested-project.md) for the
mutation policy and [ADR 0017](adr/0017-use-one-validation-graph-at-every-gate.md) for the graph the gates
share.

The pre-commit hook scans the staged diff for secrets before lint-staged runs ESLint fixes and then Prettier on
TypeScript, Angular templates, stylesheets and JavaScript tooling scripts. Other supported staged files only run
through Prettier.

## Security controls

Install the locked mise tools before running the security commands. Gitleaks and actionlint versions and
artifact checksums live beside Node.js and npm in `mise.toml` and `mise.lock`.

`npm run validate:security` checks the workflows, runs the synthetic rejection proofs, scans the complete Git
history and writes a dated npm audit report under `artifacts/security/`. The audit exits `1` for any high or
critical vulnerability and `2` when the registry or report is unavailable, so an infrastructure failure cannot
look like a clean result. Exceptions require a narrow package or Gitleaks rule, a reason and an expiry date;
there are no active exceptions.

`typed-rest-client`, used by Stryker, pins a vulnerable `qs` release. A scoped npm override installs `qs`
6.16.0, which corrects
[GHSA-4mjr-xmp4-gh2g](https://github.com/ljharb/qs/security/advisories/GHSA-4mjr-xmp4-gh2g),
[GHSA-q8mj-m7cp-5q26](https://github.com/ljharb/qs/security/advisories/GHSA-q8mj-m7cp-5q26) and
[GHSA-x5fp-wj9c-mxmx](https://github.com/ljharb/qs/security/advisories/GHSA-x5fp-wj9c-mxmx).
Remove this override when Stryker's compatible `typed-rest-client` release permits a corrected `qs`.

`concurrently` and `npm-run-all2` pin `shell-quote` 1.9.0, which carries
[GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) (command injection in `quote()`). An
npm override installs 1.12.0, the corrected release. Remove it when both tools depend on a corrected
`shell-quote`.

Angular 22 removes the former CLI dependency chain through `pacote`, `make-fetch-happen` and
`http-cache-semantics`. The build tool also pins the corrected Piscina release directly, so neither an audit
exception nor a Piscina override is needed.

The `security-and-workflows` CI job runs on pull requests, pushes to `main` and the weekly schedule. The other
jobs in its workflow skip that scheduled event. Its report, history-scan result and duration are uploaded
together. The initial repository-history scan found no secret.

## TypeScript tooling compatibility

Angular 22 requires TypeScript 6. The installed `openapi-typescript` and the `tsconfck` dependency of
`vite-tsconfig-paths` still declare TypeScript 5 peer ranges. Scoped overrides select the project's pinned
TypeScript for those two consumers; normal `npm ci` remains reproducible without force or legacy peer
resolution. API generation must remain byte-identical and the Vitest path aliases must resolve under the
full unit suite. Remove each override when its upstream peer range accepts the project's TypeScript version.
These compatibility overrides do not suppress any security advisory.

## Explicit local validation

The repository does not register a Codex completion hook. Run the checks relevant to the change during the
work, and invoke `npm run validate:complete` when the complete local graph is needed. Finishing a response
does not launch validation automatically.
