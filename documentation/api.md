# API integration

Rules for generated contracts, HTTP adapters, pagination and business refusals.

## Generate the wire contract in each workspace

`.glm-back-revision` contains the full immutable commit SHA of `glm-back` used by this front revision.
`npm run api:generate` downloads the OpenAPI document at that exact commit through authenticated `gh`,
generates `app/generated/schema.d.ts`, and formats both files. CI runs the same command in every job that
needs the contract.

Generation happens in a sibling staging directory. A malformed, missing or inaccessible revision, a failed
download, invalid OpenAPI or failed formatting leaves the previous generated files in place and exits with
an explicit error. Only a complete contract and type declaration replace the previous pair. Other files in
`app/generated/` are preserved. The generated files are local build inputs and are ignored by Git.

To update the backend contract:

1. Resolve the intended backend commit with
   `gh api repos/glm-project/glm-back/commits/<ref> --jq .sha` and put the returned 40-character SHA in
   `.glm-back-revision`. Never put a branch or tag there.
2. Run `mise exec -- npm ci`, then `mise exec -- npm run api:generate`.
3. Run the generation twice and compare SHA-256 hashes of `app/generated/openapi.json` and
   `app/generated/schema.d.ts`; both runs must be byte-identical.
4. Run lint, Prettier, all TypeScript scopes, coverage, component tests, application tests and the production
   build. Review compilation failures as the visible front impact of the backend change.

A separate compatibility check may generate from the latest backend revision, but it must use a temporary
revision and workspace. It does not replace the pinned validation and does not update `.glm-back-revision`.

`app/generated/` deliberately has no `package-info.ts`. It remains under `app/` so the architecture project
can resolve imports from it: secondary adapters may use wire types, while domain imports fail the dependency
rules. ESLint ignores the generated declaration file because the project does not own its shape or comments.

## Secondary adapters translate at the boundary

`ApiClient` is the only ordinary path to the back end. It is generic over OpenAPI `paths`, tying route, verb,
path parameters, query parameters, body and response together at compilation. It uses Angular `HttpClient`,
so the global bearer interceptor applies. Device-enrolment protocol traffic is the separate `HttpBackend`
exception described in [`authentication.md`](authentication.md).

Keep generated response types in `infrastructure/secondary`. Translate them into hand-written domain
models before returning through a port.

The generated response contract distinguishes guaranteed fields from genuinely optional projections. Read
guaranteed fields directly and guard only an optional field that the domain cannot represent without a value.
Generated request bodies already express their required fields.

Assign compatible wire literals directly to domain unions. TypeScript then fails when the wire union widens;
do not duplicate it in a mapping table without a semantic translation.

## Reads state their bounds

Online list ports make one request with `PAGE_SIZE` and return `Page<T>`.
`buildPageFrom` preserves the server total so `isComplete()` tells callers whether the page is truncated.
A bounded read is acceptable only when the bound is visible in the result.

The offline pupitre reference is different: it traverses every page and activates neither operators nor
workshop data until both collections are complete. [`offline-pupitre.md`](offline-pupitre.md) owns that
workflow.

## Translate refusals by stable code

`findApiErrorIn` reads the `urn:glm:erreur:<context>:<code>` and message from a `ProblemDetail`. Branch on
that stable code, not HTTP status plus title. Each context translates the codes its ports can produce into
its own refusal type.

A known business refusal rejects the promise with the context refusal and original message. An unknown code
stays a technical failure: expanding the domain union is a deliberate change, and a forgotten code must fail
loudly rather than take the wrong business branch.

Absorption belongs to a business operation. Arrival assurance may absorb an already-open day; implicit
resumption may absorb a forbidden presence transition. The same HTTP status on an explicit operator gesture
remains visible.

`GesteReplayPolicy` owns the contextual exceptions and the single `saisie-concurrente` retry. The transport
normalizes the workshop motif but keeps the original diagnostic code. A concurrent refusal triggers a reread
of the affected aggregate and one identical retry with the original UUID and business timestamp.

[ADR 0006](adr/0006-how-the-front-calls-the-back.md) records the typed-client decision; ADRs 0007 and 0009
record the later complete-reference and replay refinements.
