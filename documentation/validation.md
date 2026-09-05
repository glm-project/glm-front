# Validation

## One command graph

`package.json` owns the validation graph used by local hooks and CI. `npm run validate:quick` verifies the
pinned runtime, generates the pinned API contract, then runs lint, formatting, TypeScript and workflow checks.
`npm run validate:complete` adds security reports, coverage, both production builds, component tests,
application tests and the production offline restart. The browser groups run in sequence so their Angular
servers never share one workspace at the same time.

CI invokes the same grouped commands in separate workspaces. Each job records its duration as an artifact.
The pre-push hook records the complete local duration on standard output and returns the validation exit code.
The pre-commit hook scans the staged diff for secrets before lint-staged runs ESLint fixes and then Prettier on
TypeScript and Angular templates. Other supported staged files only run through Prettier.

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

## Codex completion hook

`.codex/hooks.json` registers the supported Codex `Stop` event. On the first stop it runs
`npm run validate:complete`; success lets the turn finish and failure continues the turn with the command's
failure output. The continued turn is validated again. If that second validation still fails,
`stop_hook_active` makes the hook stop with an explicit failure instead of starting another continuation, which
bounds the loop while checking the agent's final edits.

Codex first requires a person to trust the project directory, which activates its `.codex` configuration
layer. `/hooks` then requires a separate review of the hook definition and stores that trust against its exact
hash. A new checkout can require project trust, and any hook change requires a new hook review. Repository
files cannot grant either trust. The one-off CLI proof uses `--dangerously-bypass-hook-trust` only in an
isolated, pre-reviewed fixture; this flag is not part of the project configuration.

Measured acceptance evidence is recorded in [the harness run log](evidence/84-harness.md).
