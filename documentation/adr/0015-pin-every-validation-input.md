# 0015 — Pin every validation input

## Status

Accepted

## Context

The same front commit could run with different Node.js and npm versions locally and in CI. CI restored
dependencies with `npm install`, which can reconcile and rewrite a lockfile instead of rejecting drift. API
generation downloaded `glm-back`'s current default-branch contract, so two validations of one front commit
could compile against different wire contracts. A failed shell redirection could also leave a partial
generated input behind.

The repository already commits exact direct dependency versions and `package-lock.json`. Generated API files
remain workspace inputs because committing them would duplicate a backend-owned contract and create large
mechanical diffs.

## Considered options

- Exact Node.js and npm in `mise.toml`, a mise artifact lockfile and an immutable backend SHA — **kept**.
- `actions/setup-node` plus prose for local setup — rejected: Node.js and npm versions would live in separate
  places and local validation would not enforce either one.
- A container image for every validation — rejected: it adds image publication and platform maintenance for
  two runtimes that mise can install directly.
- Commit generated OpenAPI and TypeScript declarations — rejected: it duplicates backend-owned data and does
  not identify which backend commit produced it.
- Continue generating from the backend default branch — rejected: the input changes without a front commit.

## Decision

Keep exact Node.js and npm versions in `mise.toml`, and commit `mise.lock` with the resolved runtime artifacts.
`package.json` repeats those versions as executable engine and package-manager assertions;
`npm run runtime:check` fails when they drift from `mise.toml` or the running tools. npm uses strict engine
checking. CI pins both the mise action commit and the mise release, verifies the runtime in every job, and
restores dependencies only with `npm ci`.

Keep the full `glm-back` commit SHA in `.glm-back-revision`. Generate the OpenAPI contract and TypeScript
declaration together in a staging directory, then replace the generated directory only after every command
succeeds. Preserve unrelated files already present in that directory. Never fall back to a branch, tag,
latest revision or previous partial output when the pinned revision cannot be read.

Update either pin deliberately, regenerate its lock or outputs, and run the complete validation under mise.
Compatibility experiments against the latest backend use a temporary workspace and stay separate from the
pinned validation.

## Consequences

### Positive

- Local and CI validation execute the same Node.js, npm, dependency graph and backend contract revision.
- A manifest/lockfile mismatch, wrong runtime or unreachable backend commit fails before validation can claim
  success.
- Repeated generation with the same inputs is byte-identical and never publishes half of the generated pair.

### Negative

- Contributors must install mise and authenticate `gh` before a fresh validation can run.
- Runtime and backend upgrades now require explicit pin and lock updates followed by the full validation.
- CI depends on a pinned third-party setup action and downloads the backend contract independently in every
  job.
