# Validation

## One command graph

`package.json` owns the validation graph used by local hooks and CI. `npm run validate:quick` verifies the
pinned runtime, generates the pinned API contract, then runs lint, formatting, TypeScript and workflow checks.
`npm run validate:complete` adds security reports, coverage, both production builds, component tests,
application tests and the production offline restart. The browser groups run in sequence so their Angular
servers never share one workspace at the same time.

CI invokes the same grouped commands in separate workspaces. Each job records its duration as an artifact.

No pre-push hook is registered and CI runs no mutation, so nothing checks a push before CI unless you do.
Before pushing, run `npm run validate:quick`. When the branch adds or modifies handwritten domain TypeScript,
also mutate those lines against the point where the branch left `main`:

```bash
printf 'HEAD %s refs/heads/main %s\n' "$(git rev-parse HEAD)" "$(git merge-base HEAD origin/main)" \
  | npm run test:mutation:diff -- origin
```

`test:mutation:diff` reads ref lines in the pre-push format on standard input, mutates only the changed
domain lines and fails below the 100 % threshold. Without a mutable domain line it prints
`No changed domain TypeScript files to mutate.` and exits 0. Neither command reruns coverage, builds or
browser suites, which the CI jobs own. The complete local graph runs on explicit invocation with
`npm run validate:complete`. See [ADR 0024](adr/0024-extend-mutation-to-the-unit-tested-project.md) for the
mutation policy and [ADR 0017](adr/0017-use-one-validation-graph-at-every-gate.md) for the graph the gates
share.

The pre-commit hook scans the staged diff for secrets before lint-staged runs ESLint fixes and then Prettier on
TypeScript, Angular templates and JavaScript tooling scripts. Other supported staged files only run through Prettier.

## Security controls

Install the locked mise tools before running the security commands. Gitleaks and actionlint versions and
artifact checksums live beside Node.js and npm in `mise.toml` and `mise.lock`.

`npm run validate:security` checks the workflows, runs the synthetic rejection proofs, scans the complete Git
history and writes a dated npm audit report under `artifacts/security/`. The audit exits `1` for any high or
critical vulnerability and `2` when the registry or report is unavailable, so an infrastructure failure cannot
look like a clean result. Exceptions require a narrow package or Gitleaks rule, a reason and an expiry date;
there are no active exceptions.

The `security-and-workflows` CI job runs on pull requests, pushes to `main` and the weekly schedule. The other
jobs in its workflow skip that scheduled event. Its report, history-scan result and duration are uploaded
together. The initial repository-history scan found no secret.

## Explicit local validation

The repository does not register a Codex completion hook. Run the checks relevant to the change during the
work, and invoke `npm run validate:complete` when the complete local graph is needed. Finishing a response
does not launch validation automatically.
