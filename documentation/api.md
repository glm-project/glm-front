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

Routes reach the back end on the front's own origin, with no base URL configured anywhere. Development
holds that through `proxy.conf.json`; a deployed pupitre holds it through `functions/api/_middleware.js`, the
Cloudflare Pages Function that relays `/api/**` to the back-end origin its `API_ORIGIN` variable names, and
that answers 500 rather than proxy anywhere when that variable is missing. `dev:gestion:hprod` swaps the
development proxy for `proxy.hprod.conf.json`, which relays `/api/**` to `glm-supervision.pages.dev` and so
through that Function; it builds with the `deployed` environment and the non-production Keycloak origin,
because that back end accepts only tokens its own Keycloak issued. Keep the front same-origin rather than
giving `ApiClient` an absolute origin: see [ADR 0034](adr/0034-proxy-the-api-at-the-edge.md) for what that
buys and what it costs.

Bound each `ApiClient` read and write to thirty seconds. A timeout cancels the outstanding HTTP subscription
and remains a technical failure. In the pupitre, it releases the exchange locks and leaves the gesture pending
for a later synchronization with the same identity and business timestamp; it never becomes a business refusal.

Keep generated response types in `infrastructure/secondary`. Translate them into hand-written domain
models before returning through a port.

The generated response contract distinguishes guaranteed fields from genuinely optional projections. Read
guaranteed fields directly and guard only an optional field that the domain cannot represent without a value.
Generated request bodies already express their required fields.

Assign compatible wire literals directly to domain unions. TypeScript then fails when the wire union widens;
do not duplicate it in a mapping table without a semantic translation.

## Reads state their bounds

Online list ports make one request with `PAGE_SIZE` and return `Page<T>`.
`buildPageFrom` preserves the server total alongside the returned elements so callers can identify truncation.
A bounded read is acceptable only when the bound is visible in the result.

The offline pupitre reference is different: `GET /api/pupitre/referentiel` returns operators and workshop
elements together, unpaged, from one repeatable-read server transaction. It takes no page, size or state
parameter, and its `genereLe` version is deliberately ignored. [`offline-pupitre.md`](offline-pupitre.md)
owns that workflow.

For the Gestion operational report, the single read port composes synthesis and time sheet with one
`evaluation` sampled when acquisition starts. Both responses must echo that instant; compare instants rather
than ISO spellings. A 400 refusal or an inconsistent echo rejects the reading and is reported once. The
technical evaluation stays outside the view URL. Received complete/incomplete totals and interpreted activity
states are translated into context values; the adapter does not reconstruct them from raw clockings.

The cost reading also keeps one domain port for the element. Its server evaluation, excluded current-activity
count, automatic periods and every responsible conflict are translated directly, including other elements.
Each duration and amount total carries its own completeness: incomplete totals have no value, while a complete
total missing its optional wire value rejects the read. Periods without a reliable finish keep that absence.
The adapter preserves the received totals, rounding and category independence.

## Translate refusals by stable code

`findApiErrorIn` reads the `urn:glm:erreur:<context>:<code>` and message from a `ProblemDetail`. Branch on
that stable code, not HTTP status plus title. Each context translates the codes its ports can produce into
its own refusal type.

A known business refusal rejects the promise with the context refusal and original message. An unknown code
stays a technical failure: expanding the domain union is a deliberate change, and a forgotten code must fail
loudly rather than take the wrong business branch.

Workshop publication is the exception: `AtelierExchangePort.send` resolves a readonly
`Result<PublicationAcceptee, RefusDePublication>`. Every structured business refusal recognized by `findApiErrorIn` retains
its original code and message, including codes without a known replay motif, as required by ADR 0007 and
ADR 0009. Unexpected technical failures still reject; synchronization reports them through `ErrorHandlerPort`
and preserves pending work while marking disconnection. This result describes the server exchange, not local
durable acceptance. Its minimal type and constructors stay in the atelier synchronization domain; see the
[publication amendment in ADR 0006](adr/0006-how-the-front-calls-the-back.md#publication-amendment).

A 200 or 201 publication remains accepted when its response contains conflicts. `PublicationAcceptee`
retains those diagnostics, including unresolved optional operator or workstation references. Persist them
with the accepted gesture before refreshing the reference. Stable missing or inconsistent target refusals
remain final; no arrival is absorbed.

Pointage bodies carry the captured `intention`: an opening has no target, a transition and a finish carry
`cible`, the original stable opening identity. The adapter sends these fields directly and never infers
intent from category or workstation. Concurrency rereads only the affected workshop item.

`GesteReplayPolicy` owns the single `saisie-concurrente` retry. The transport
normalizes the workshop motif but keeps the original diagnostic code. A concurrent refusal triggers a reread
of the affected aggregate and one identical retry with the original UUID and business timestamp.

[ADR 0006](adr/0006-how-the-front-calls-the-back.md) records the typed-client decision;
[ADR 0007](adr/0007-durable-offline-pupitre.md) and [ADR 0009](adr/0009-pupitre-domain-responsibilities.md)
record the later complete-reference and replay refinements.
