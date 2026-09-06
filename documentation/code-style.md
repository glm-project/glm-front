# Code style

## Code carries its own intent

**No comments. None.** Not even a _why_, not even an external constraint — that exemption is what every
comment in this repo was written under. When the urge shows up, refactor: rename, extract a function or an
object. The rationale that felt worth a comment goes in the commit message, in the MR, or as a rule in the
topic doc that owns it — places that get read and updated, unlike a comment that drifts from the code it
sits on. A comment you cannot relocate is a design you have not finished. Machine-readable directives
(`eslint-disable`, `@ts-expect-error`, `prettier-ignore`) are not comments; they are instructions to a tool,
and each still needs its own justification elsewhere. `local/no-comments` (`eslint.config.mjs`) fails the
build on anything else under `src/`, TypeScript and templates alike, tests and generated files included —
so this is a lint error and not a review argument.

**A named function instead of an inline ternary.** `x !== undefined ? Foo.of(x) : undefined` becomes
`toFoo(x?: Type): Foo | undefined`. The ternary hides the business intent.

**Positive predicates.** Expose `x.isNotLoaded()` rather than writing `!x.loaded()`. The name states the
tested state, and the double negation disappears.

**A named interface for non-trivial parameters** — stub object, callback, config, test helpers included. The
name makes the intent readable at the call site. Provide a named default constant rather than an inline
literal.

> eslint gotcha: `@typescript-eslint/prefer-function-type` rewrites into a `type` any interface reduced to a
> call signature (`interface X { (): T }`), at the commit hook. To keep a real interface, give it a named
> member — `interface AuthPort { getToken: () => string | undefined }` — and pass a stub object.

## Extract methods when the logic obscures the intent

Extract a coherent step as soon as it needs its own explanation, mixes orchestration with details, or
buries a decision inside nested branches or a long callback. Review long methods for these signals and
extract the complicated steps before merging; no fixed line count replaces that judgment.

Keep callers at one level of abstraction. Name each extracted method for its purpose, keep it close to
its caller, and prefer private methods over new services without a separate responsibility. A forwarding
method that adds no intent is not an improvement. This applies to production code and test helpers.

Preserve asynchronous ordering, callback evaluation time, identifiers, lock boundaries and error handling.
Run the existing behavioral tests before and after extraction; keep behavior changes separate. See
[ADR 0008](adr/0008-extract-methods-to-expose-intent.md) for the decision and its costs.

## Tell the owner, do not inspect its representation

Put each business decision on the object that owns the data needed to make it. A caller asks a named domain
question or sends an intention; it does not branch on another object's optional fields, enum values or
collection cardinality and reconstruct that object's rules. Prefer `pointage.hasNoPoste()` to
`pointage.posteId === undefined`, `operateur.requiresPosteChoice()` to `operateur.postes.length > 1`, and a
decision result such as `choixDePosteRequis` to a caller assembling the same condition from getters.

Keep serializable HTTP and storage documents as data at their adapter seam. Rehydrate a behavior-bearing
domain object before making business decisions, and keep its representation private so TypeScript prevents
callers from bypassing its interface. The owning implementation may inspect its own fields; a secondary
adapter may inspect a transport document only to translate it.

A primary adapter may inspect a dedicated view projection to render it. It still sends an intention through
the command interface instead of reconstructing a business command from that projection.

Apply the SOLID test to every changed conditional: the module with the business reason to change owns the
decision, callers depend on its intention-level interface, and adding a domain case extends that owner rather
than editing conditionals across callers. Before considering a TypeScript change complete, account for every
conditional added or modified; move any conditional that chooses behavior from another object's representation
behind that object's interface.

## Follow the Angular idioms already in the code, not the older ones that still compile

- `inject()`, never constructor injection (`gestion/app.ts:18`, `gestion/header/header.ts:19`,
  `KeycloakOidcAuthentication.ts:9`);
- `signal()` for local component state (`App.appName`, `gestion/app.ts:17`);
- `input.required()` for what a parent gives a component (`pupitre/header/header.ts`);
- standalone components, no `NgModule`;
- signals expose state, `computed()` derives it, and application commands trigger work. Angular `effect()`
  and `afterRenderEffect()` are forbidden by ESLint; use explicit orchestration or a one-shot render hook.
  Import Angular Core through named static imports: namespace and dynamic imports are blocked to keep
  this restriction enforceable;
- component and directive selectors are prefixed `glm` (`glm-root`, `glm-pupitre-header`) — enforced by
  `angular-eslint`;
- `private readonly` for injected collaborators.

## Domain concepts in French, technical names and action verbs in English

Business vocabulary stays in French — it is the ubiquitous language the domain speaks
(`RefusDAtelier`, `SuiviDAtelier`, `PosteDeTravail`). Technical classes, types, ports and helpers use English,
including in `domain/`: `ApiClient`, `LocalStoragePort`, `Page`. Mixed names keep the business concept in
French and express the technical role in English: `PupitreRuntime`,
`DesignationExpirationSchedulerPort`. Keep filenames and references aligned with those names.

The verb driving an action is English: `send`,
`sendAbsorbing`, `toRefusDAtelier`, not `envoyer`, `envoyerEnAbsorbant`, `refusDAtelierDans`. A
name that reads as a hidden verb behind a French preposition (`xxxDans`, `versXxx`, `xxxDe`) needs an
explicit English verb instead of the preposition standing in for one. Constants and types carrying
only domain nouns keep their French name (`CODES_DE_REFUS_D_ATELIER`, `CodeDeRefusDAtelier`).

## Linting and formatting

ESLint is strict on `main/webapp/**`: `typescript-eslint` `strictTypeChecked` + `stylistic` +
`angular-eslint` recommended (`eslint.config.mjs`). SonarJS recommended rules cover every TypeScript source;
cognitive complexity may not exceed 7. Its type-return, null-dereference and argument-type rules stay disabled
because they conflict with discriminated unions or duplicate TypeScript strict checks with false positives. A
rule that fires is a design signal, not noise to silence. Non-null assertions (`value!`) and definite-assignment
assertions (`property!:`) are forbidden: initialize the value, model its possible absence or narrow it explicitly.
See [ADR 0019](adr/0019-enforce-sonarjs-rules.md).

**Prettier owns formatting.** Single quotes, 140-char width, `arrowParens: avoid`. Run
`npm run prettier:format`; never hand-format. The commit hook enforces both — see
[`git-and-mr.md`](git-and-mr.md).
