# Code style

## Code carries its own intent

Avoid comments that repeat the code. Write a short local comment only for a constraint, external behavior or
trade-off the code cannot make clear, and keep it next to the affected code. Put durable rules in the topic
document that owns them. A tooling directive (`eslint-disable`, `@ts-expect-error`, `prettier-ignore`) states
why that exceptional instruction remains necessary. Comments are a review judgment; ESLint does not infer
their usefulness. Generated files are exempt because the project does not own their text.

Extract an inline conditional only when the name adds an intention or the expression obscures the flow.
`x !== undefined ? Foo.of(x) : undefined` may become `toFoo(x?: Type): Foo | undefined`; a short local
conditional whose meaning is already clear stays local.

Name predicates after the state they answer. Prefer an affirmative question where it reads naturally; a simple
negation such as `!loaded()` is clear, while double negatives are not.

Name object contracts that carry a meaningful responsibility. A callback that is only a callback remains a
function type; give it a named type only when its role clarifies the call site. Name reusable defaults rather
than repeating significant literals.

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

## Give every business rule a domain owner

Put each business decision with the domain concept that owns its reason to change. A class encapsulates state
and invariants; a pure function may own a policy or build a projection. A caller asks a named domain question
or sends an intention instead of reconstructing a rule from another owner's representation. Prefer
`operateur.requiresPosteChoice()` to a caller assembling that condition from getters.

Keep serializable HTTP and storage documents as data at their adapter seam. Rehydrate a behavior-bearing
domain object before decisions that need its invariants. A pure policy or projection may inspect a
discriminated union when that union is its public contract; the owner keeps the exhaustive cases together.
The owning implementation may inspect its own fields; a secondary adapter may inspect a transport document
only to translate it.

A primary adapter may inspect a dedicated view projection to render it. It still sends an intention through
the command interface instead of reconstructing a business command from that projection.

Apply the SOLID test to every changed conditional: the module with the business reason to change owns the
decision, callers depend on its intention-level interface, and adding a domain case extends that owner rather
than editing conditionals across callers. Before considering a TypeScript change complete, account for every
conditional added or modified; keep a policy or projection's exhaustive cases in its domain owner, and move a
caller reconstructing another owner's rule behind that owner's interface.

## Follow the Angular idioms already in the code, not the older ones that still compile

- `inject()`, never constructor injection (`gestion/app.ts:18`, `gestion/header/header.ts:19`,
  `KeycloakOidcAuthentication.ts:9`);
- `signal()` for local component state (`App.appName`, `gestion/app.ts:17`);
- `input.required()` for what a parent gives a component (`pupitre/header/header.ts`);
- standalone components, no `NgModule`;
- signals expose state, `computed()` derives it, and application commands trigger work. `effect()` and
  `afterRenderEffect()` do not orchestrate a business operation or propagate application state. A primary
  presentation adapter may use one for a narrow imperative browser integration when its lifetime and cleanup
  are explicit; keep the reason in a local comment. ESLint permits these imports only in
  `infrastructure/primary/` and cannot determine whether a use is semantically justified. Import Angular Core
  through named static imports: namespace and dynamic imports remain blocked;
- component and directive selectors are prefixed `glm` (`glm-root`, `glm-pupitre-header`) — enforced by
  `angular-eslint`;
- use `private` for implementation details, `protected` for members consumed only by a component template,
  and `public` only for a component contract; mark references `readonly` unless replacement is part of their
  state transition. Use `private readonly` for injected collaborators.

## Keep domain models and contracts immutable

Every domain model is immutable. Mark all of its properties `readonly`, including private, protected and
`#private` state. A transition named `after…` returns the next model version without modifying its receiver;
the application replaces its current reference with that version. Immutable values may be shared between model
versions. A local collection may be mutable while constructing a result, provided it does not mutate an input
or escape as a mutable model, decision or snapshot.

Expose commands, decisions and projections as `readonly`, including nested collections. A method named
`snapshot()` states whether it returns an independent copy or shares an immutable value. When it returns a
copy, changing that object cannot alter the owner or a later snapshot. Use a discriminated union when states
have incompatible fields, and model forbidden fields as `never` when the public contract must reject their
carry-over.

Name an immutable value object for a business collection when it owns a rule or query: qualifications decide
whether a workstation choice is required and validate the chosen workstation. Keep transport documents and
rendering projections as readonly collections when they carry no collection rule. ESLint checks readonly syntax;
review decides when the business responsibility warrants a value object.

An asynchronous operation is awaited, returned to its caller, or observed through an explicit error path.
The observer reports a technical failure to the application's error boundary or diagnostics; it does not turn
a fire-and-forget rejection into a silent `void`. Keep business refusals, technical failures and failures
already rendered to an operator distinct.

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
The local responsibility-cohesion rule blocks a production class only when injected collaborators, public
operations and owned state all cross the coordinator tripwire. Inventory its reasons to change and extract a
cohesive responsibility; a narrow inline suppression is reserved for a demonstrably single deep module and
states that reason beside the class. See [ADR 0019](adr/0019-enforce-sonarjs-rules.md) and
[ADR 0023](adr/0023-stop-overloaded-coordinators-at-lint.md).

**Prettier owns formatting.** Single quotes, 140-char width, `arrowParens: avoid`. Run
`npm run prettier:format`; never hand-format. The commit hook enforces both — see
[`git-and-mr.md`](git-and-mr.md).
