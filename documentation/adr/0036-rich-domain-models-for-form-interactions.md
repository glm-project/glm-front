# 0036 — Model user interactions and forms in rich domain models

## Status

Accepted. Complements [ADR 0013](0013-keep-business-decisions-in-rich-domain-models.md) and
[ADR 0028](0028-default-to-value-objects-for-domain-values.md).

## Context

Web frontends frequently implement forms and data entry using framework-specific abstractions such as
Angular `ReactiveFormsModule` (`FormGroup`, `FormControl`, `Validators`). While convenient for simple CRUD,
this approach couples validation rules (mandatory fields, maximum lengths, positive numeric ranges) and error
state to the framework. Testing these rules requires Angular testing harnesses or synthetic form controls.
More critically, it promotes anemic domain models where domain classes become mere passive data containers,
and business interaction rules (such as clearing a server duplicate error when the user edits a field) are
scattered across UI components.

[ADR 0013](0013-keep-business-decisions-in-rich-domain-models.md) and
[`architecture.md`](../architecture.md) already state: _"Domain models may describe user interactions:
numeric entry, correction, explicit validation and expiration belong there when the product defines them as
rules of a business process. A keyboard or screen origin does not make a rule presentation-only."_ The pupitre
proves this pattern with `DesignationOperateur`.

## Considered options

- Rich immutable domain models for form interaction (`FormulairePosteDeTravail`) — **kept**.
- Angular `ReactiveFormsModule` (`FormGroup`, `FormControl`, `Validators`) — rejected: couples business validation to Angular, untestable with pure Vitest unit tests, and creates anemic models.
- Template-driven forms (`FormsModule`) with inline component validation — rejected: keeps validation logic in UI components rather than in the domain.

## Decision

Model form interactions as rich, immutable domain objects in the bounded context's `domain/` layer.

A form model (e.g., `FormulairePosteDeTravail`):

1. Owns its initialization for creation and modification (`pourCreation()`, `pourModification(element)`).
2. Provides immutable transition methods on keystroke (`avecLibelle(texte)`, `avecNature(texte)`, etc.).
3. Enforces interaction rules directly in the domain (e.g. modifying an input clears its previous server refusal).
4. Validates synchronous business constraints against Value Objects and exposes its validation state (`estValide()`, `erreurLibelle()`, etc.).
5. Receives server refusal results (`avecRefus(refus)`).
6. Produces validated domain commands (`produireCommande(): Result<Commande, ErreursFormulaire>`).

Primary UI dialogs and components become razor-thin projection surfaces: they maintain a single Angular signal
holding the immutable form instance, forward DOM input events into domain transitions, and render domain error
strings through project CSS tokens.

## Consequences

### Positive

- 100 % unit-testable in pure TypeScript under Vitest in milliseconds, with zero Angular, DOM or TestBed overhead.
- Business validation rules are concentrated in the domain alongside their Value Objects.
- UI components contain zero business logic and remain declarative bindings.
- Zero dependency on `@angular/forms` across the codebase.

### Negative

- Every form field transition requires an explicit immutable method on the domain form object.
- The UI component must map DOM input events explicitly rather than relying on two-way framework directives.
