# 0006 — Call the back through a typed client, and translate at the adapter

## Status

Accepted, amended by [ADR 0007](0007-durable-offline-pupitre.md): the offline reference traverses all pages,
and concurrent writes reread the affected aggregate before an identical retry. The original account below
records the earlier implementation.

## Context

[Issue 6](https://github.com/glm-project/glm-front/issues/6) settled seven decisions on how the front reaches
the API — generated types read by `infrastructure/secondary` only, hand-written domain classes, a stable error
code published by the back. None of them had been executed: before this record, `glm-front` held
`app/api/schema.d.ts` and not one secondary adapter.

Executing them surfaced facts the decision could not have:

- **The generated types lie about errors.** An error `@ApiResponse` carries no `content`, so springdoc falls
  back on the operation's return type: `POST /api/atelier/journees` declares its 409 as a
  `RestJourneeDeTravail`. No generator can type the error path.
- **The generated types lie about what is present.** `openapi.json` marks `required` on almost no response
  schema — `RestSuiviDAtelier`, `RestActiviteEnCours` and every `PageRest*` carry none at all, so `id`, `etat`
  and `totalElementsCount` all read as optional. Request bodies, by contrast, are correctly marked.
  [Issue 61](https://github.com/glm-project/glm-front/issues/61) is the back-side fix.
- **A page is capped at 100 and `size=200` answers 500**, not 400: the cap is an `AssertionException` no advice
  maps.
- **`GET /api/atelier/suivis` sorts by engagement date descending** and embeds each element's complete journal —
  around 30 kB apiece, so 3 MB for a hundred. `GET /api/operateurs` sorts by name then first name.
  [Issue 62](https://github.com/glm-project/glm-front/issues/62) is the projection that would lift this.
- **Two compositions of calls are business gestures, not routes**: clocking in means opening the working day if
  it is not open, and resuming presence if it is paused. Each swallows one 409 — and only its own.

## Considered options

- **A small typed client, generic over `paths`, built on `HttpClient`** — kept: route, verb, `{id}`
  substitution, query parameters and answer become one type, so naming the wrong route does not compile, and
  `httpAuthInterceptor` still applies.
- A generated Angular client — rejected in issue 6 already: it would have to be excluded from coverage, lint and
  arch-unit, the four controls that hold this repository.
- `HttpClient` called directly from each adapter with a string URL — rejected: a mistyped route, a verb the
  route does not serve and a misspelt query parameter all compile, and the answer is typed by hand at every
  call site.
- An in-memory adapter behind each port, for the tests — rejected: this repository substitutes only where it
  _cannot_ intercept, which is what ADR 0002 holds against `auth.provider.cypress.ts`. `/api/**` is
  interceptable, so the real adapter stays in the loop.
- Returning a `Resultat<Refus, Succes>` from a write — rejected: issue 53 will decorate these same ports with a
  durable queue, and a queued write hands back **before** the server has answered; a result type would have to
  fabricate an `{ ok: true }` that nothing has verified.

## Decision

**Reach the API through `ClientApi`** (`app/shared/api-client/infrastructure/secondary/`), a client generic over
`paths` of `schema.d.ts` and built on `HttpClient`. The keys of `paths` start with `/api/` and serve as URLs as
they are — no base URL is configured anywhere. `lire` reads, `ecrire` writes, and each takes the route plus the
`chemin`, `parametres` and `corps` that route accepts, so **the contract is held by `tsc`, not by a test**.

**Two shared kernels carry what every context needs.** `app/shared/pagination/` owns `domain/Extrait<T>` — the
one artefact a business domain imports — and the wire-side `extraitDe`. `app/shared/api-client/` owns
`ClientApi`, `obligatoire` and `codeDErreur`.

**One read is one request of `size=100`, never a loop**, and `Extrait` says what it carries: `nombreTotal` comes
from the server's own `totalElementsCount`, and `estComplet()` tells a caller whether anything was left behind.

**Guard, at the adapter, the fields the domain requires.** `obligatoire(valeur, 'suivi.id')` throws rather than
let an `undefined` the business does not have reach a domain class. Nothing guards a request body: those are
typed honestly.

**Assign the wire enums straight to the domain unions**, which repeat the same literals. No `Record` keyed by
the generated union: structural typing already fails the compilation when the back adds a value.

**Branch on the stable code, never on `status` + `title`.** `codeDErreur` reads the `urn:glm:erreur:…` a
`ProblemDetail` carries, along with the message the domain wrote; a context translates those URNs into its own
refusal class through a table in its `infrastructure/secondary`. A 400 from Bean Validation is not a refusal: at
the pupitre an invalid body comes from us, and it crosses as a technical failure. 401, 403 and network failures
never reach an adapter — they belong to each application's interceptor.

**A refusal comes back as a rejected promise**, carrying its code and its message. `Promise<void>` means
_accepted_ — by the server today, by the queue of issue 53 tomorrow.

**Where absorbing a refusal is right, it is a property of the operation, never of the route or of the status.**
`sAssurerQueLOperateurEstArrive` swallows `journee-de-travail-deja-ouverte` and nothing else;
`sAssurerQueLOperateurEstPresent` swallows `transition-de-presence-interdite` and nothing else. The same 409 on
`pointerLaPresence` is a refusal the operator must see.

**Replay `saisie-concurrente` once, immediately, then let the refusal through.** Replaying is re-issuing the
identical `POST`: the body is entirely known to the client, there is nothing to re-read.

This record also names two revisions of issue 6:

- **Decision 6 — "the adapter loops" — becomes one bounded request.** Its rejection targeted truncating
  _without saying so_; `totalElementsCount` arrives in the answer and `Extrait` says it. What makes the bound
  acceptable is that it is visible, not that it is large.
- **Decision 3's exhaustive `Record` keyed by the generated union becomes direct assignment.** The `Record`
  bought nothing structural typing does not already give, and it cost a table per enum.

**Assumption carried, and worth naming**: a network outage on the shop floor lasts hours, never days. It is the
ground under the unbounded queue of issue 53; the day it falls, that is the ticket to reopen.

## Consequences

### Positive

- Naming a route the API does not serve, a verb it does not answer, a query parameter it does not read or a
  path parameter it does not take fails the compilation. Measured on four deliberate mistakes: all four caught
  by `tsc`, none reaching a test.
- The 100 % per-file bar costs nothing here: `schema.d.ts` is a declaration file, so it emits no module and
  appears in no coverage report.
- One place knows the URN format, one place knows how a page becomes an extract, and one place knows that a
  field the domain requires may be missing. A context adds a table of its own codes and nothing else.
- The ports are the seam issue 53 decorates. Nothing in an adapter knows whether it is being queued.

### Negative

- **A read is truncated at 100 and the pupitre has no way to ask for more.** `estComplet()` says it; nothing
  yet shows it. For `GET /api/atelier/suivis`, sorted by engagement date descending, the elements lost are the
  oldest ones still open — precisely those an operator is most likely to be looking for. Issue 62 is the lever;
  until it lands the bound is real.
- **A hundred `RestSuiviDAtelier` carry a hundred complete journals**, around 3 MB, none of it read by the
  pupitre and none of it excludable.
- `ClientApi` casts its own request object once, at the point where a generic intersection meets the runtime.
  The cast is confined to two lines and every call site above it is checked.
- `codeDErreur` trusts the back's catalogue: an URN the front's union does not know crosses as a technical
  failure, silently. The union is bounded to the codes the three ports can reach, so widening it is a
  deliberate act — and forgetting to widen it degrades a refusal into a crash rather than into a wrong branch.
- **No Cypress covers any of this yet.** Nothing in `app/atelier` or `app/operateur` is wired into a front:
  issue 55 brings the providers and the screens, and the interception with them. The unit suite and `tsc` are
  the whole net today.
- What would reopen this: the back publishing honest `required` flags (issue 61) shrinks the `obligatoire`
  guards to the genuinely optional fields, and a grid projection without the journal (issue 62) reopens the
  bound of one request per read.
