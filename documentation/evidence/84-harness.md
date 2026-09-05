# Harness hardening evidence — issue 84

Execution date: 5 September 2026. Work is based on `main` commit
`4986ba7a4eb2c3429ff3dff3b2ccbfa074202dcc`, including the technical-name refactor in PR 94.
The six implementation tasks are [85](https://github.com/glm-project/glm-front/issues/85),
[86](https://github.com/glm-project/glm-front/issues/86), [87](https://github.com/glm-project/glm-front/issues/87),
[88](https://github.com/glm-project/glm-front/issues/88), [89](https://github.com/glm-project/glm-front/issues/89)
and [90](https://github.com/glm-project/glm-front/issues/90).

## Reproducible inputs

The run uses Node 24.18.0 and npm 11.18.0 installed in an isolated Mise directory. The backend revision is
`28dcdb9685adf1a67e12625e51b165b7c28361c7`. Two actual downloads and generations produced identical SHA-256 hashes:

| Artifact       | SHA-256                                                            |
| -------------- | ------------------------------------------------------------------ |
| `openapi.json` | `2f47ef4ad46ee2a4f9479a1ca15402defc6653a091a44d4f50bc5da8c8a39430` |
| `schema.d.ts`  | `443272363fdc92f5880901a1f9e7ef323ef08a5cb9e8068d681b5c7212846a26` |

An actual GitHub request for a nonexistent backend SHA failed and left the previous schema unchanged.
A separate workspace with an extra manifest dependency failed `npm ci` with a missing-lockfile-entry diagnostic;
the lockfile remained byte-identical. The runtime check rejects a Node version differing from the pin.

## Type and architecture counterexamples

The TypeScript proof substitutes an intentional type error into files already discovered by each original
project, without adding root files. It covers both production fronts, co-located and cross-front unit tests,
Cypress application/component suites, the component bootstrap fixture and shared Cypress helpers. Five
watchers started successfully against the same projects before the production-offline project was added.

Architecture fixtures exercise undeclared contexts, lookalike declarations, files outside a declared kernel,
forbidden imports and re-exports, barrel mediation, and a secondary importing both its domain and its own primary.
Ambient network, storage, browser, current-time and randomness accesses are rejected, including aliases.
Allowed counterparts include local homonyms, injected dependencies and explicit date operations. A review
counterexample first demonstrated a false rejection of `Date.parse` and `Date.UTC`, then passed after correction.
The original `arch-unit-ts` checks remain active.

## Observable safety behavior

Authentication startup failures in both shells reach Angular's error handler; the pupitre does not start its
synchronization trigger after failed restoration. Failed Keycloak logout is reported. Malformed API error
bodies are narrowed from `unknown` before refusal translation. The assertions preserve these public outcomes
if their private implementation changes.

## Integrated validation

The final clean `npm ci`, formatting, and `validate:checks-and-unit` commands exited 0.
The unit suite passed 357 tests in 37 files, with 100% statements (953), branches (488), functions (288) and lines (837).
The push hook executes the complete validation graph again before publishing the branch. GitHub check links
and merge-gate observations are recorded in the pull request, so they refer to the submitted commit.

## Security and assistant lifecycle

Gitleaks 8.30.1 scanned the complete 94-commit history with no finding before this branch was committed.
A runtime-generated synthetic credential was rejected; replacing it with safe content passed. Actionlint
1.7.12 rejected a workflow using an undefined expression and accepted the repository workflows.
The initial npm audit contained five high and eight moderate findings. Compatible patched dependencies and
removal of an unused vulnerable direct dependency reduced this to zero high/critical and two moderate findings.
The high/critical blocking threshold has no exception. Reports are dated because registry findings can change.

The actual Codex 0.153.3 CLI lifecycle was exercised in two temporary repositories with the production hook
and validation-script entry point. The passing command ran once. A command exiting 7 propagated its failure
into one model continuation, then ran again and stopped further continuation on the second failure.
Temporary credentials and fixture repositories were removed; global Codex configuration was unchanged.
The isolated proof used the supported hook-trust bypass only for its reviewed fixture. Normal activation
requires both project trust and exact-hook review through `/hooks`; repository files cannot grant either.
Codex's stopped-turn outcome does not turn its CLI process exit into the validation exit code. Required GitHub
checks provide the merge gate. See [Codex hooks](https://learn.chatgpt.com/docs/hooks).

## Replay mutation

The initial Angular command-runner measurement produced 58 mutants, with 56 reported killed and two surviving,
in 93.49 seconds. One survivor exposed a real gap: the test helper supplied its own default attempt and never
exercised the public two-argument replay decision. Online and offline refusal scenarios now prove that default.
A subsequent 98.28% run failed a temporary 99% threshold, demonstrating score-gate failure.

The final run adds Stryker's TypeScript checker, which separates invalid mutations from behavioral kills:

| Result                   |                                 Count |
| ------------------------ | ------------------------------------: |
| Killed valid mutants     |                                    34 |
| Compile errors           |                                    24 |
| Survived                 |                                     0 |
| Timed out                |                                     0 |
| Uncovered classification | Not available with the command runner |

The valid-mutant score is 100%, the permanent blocking threshold is 100%, and the final run took 78.22 seconds.
The remaining apparent equivalent from the unchecked run is actually a compile error: removing the discriminant
guard loses the gesture union's narrowing. No mutation exclusions were added. Istanbul's separate 100% source
coverage does not substitute for per-mutant coverage analysis, which the command runner cannot collect.

The command uses Angular's test builder, preserving its test initialization. It does not invoke bare Vitest.
HTML and JSON reports are generated under `reports/mutation/`; the manual and weekly workflow uploads them with
execution timing. Mutation is deliberately absent from the per-push validation graph.

## Production offline browser proof

The normal optimized pupitre bundle is served unchanged. A separate same-origin fixture bundle seeds and reads
through `PupitreJournalPort`; it does not replace the production bootstrap or know private IndexedDB keys.
The test waits for actual service-worker activation and control of a fresh production document. It disables
HTTP caching, disconnects both the Chrome page and service-worker targets, and proves the same uncached probe
succeeds online, fails offline and succeeds after restoration. A fresh controlled-client request also fails offline.

During two offline document restarts, the production shell boots, shows disconnected state, and the public
journal port still returns the exact reference and pending gesture. After reconnection and another restart,
the server records one enrollment, one token exchange and exactly one gesture publication with its original
UUID `59ef737b-c3dd-47f8-8e63-4d5526a17df3` and occurrence date `2026-09-05T08:00:00Z`.
The local journal records acceptance. The server's eight reference requests show the expected refreshes.

The negative scenario serves the identical production files while denying the worker and its manifest.
After the same verified network cut, a fresh document cannot load the pupitre shell. This demonstrates why
the positive case depends on the service worker rather than the HTTP cache or fixture server.

The aggregate build-and-browser command exited 0; the two JUnit suites totalled 3.224 seconds of test time.
The final stronger probe assertions also passed independently. The whole-command duration includes building,
server startup and Chrome startup and is recorded by the measured validation entry points.
JSON server observations and JUnit XML live under `artifacts/production-offline/` and are uploaded by the
required `production-offline-test` CI job. Fixture servers cleanly release ports 9010, 9011 and 9080.
The service worker retains asset groups only, and gestion has no service worker.

## Required GitHub checks

The active `main protection` ruleset, ID 20292974, now requires `checks-and-unit-tests`, `component-tests`,
`application-tests`, `production-build`, `production-offline-test` and `security-and-workflows`, all bound to
the GitHub Actions integration. It requires a current base, has no bypass actor and preserves every previous
rule (pull request, linear history, deletion and non-fast-forward protection).

For PR 95, commit `282e8d740a63545057199d0d5c98b00d5954bce3` was observed as `BLOCKED` while the six required jobs
were queued or running. The [first CI run](https://github.com/glm-project/glm-front/actions/runs/33981339248)
then passed all six jobs, and GitHub reported `CLEAN`. It took 91 seconds from creation to completion.
Local negative checks separately demonstrate type-error rejection, invalid workflow rejection, staged-secret
rejection and a mutation score below its threshold. These are deliberately failing validation inputs;
the recorded GitHub transition is pending to successful, not a fabricated failing CI run.

The first real pre-commit and pre-push hooks exited 0 in 3.04 and 54.83 seconds respectively. Post-push inspection
also exposed inherited Git environment variables leaking a test fixture into the invoking worktree's index.
The fixture subprocesses now isolate Git's local environment, and a regression test verifies that the invoking
repository's index remains unchanged. The final push reruns the full graph with that fix.
