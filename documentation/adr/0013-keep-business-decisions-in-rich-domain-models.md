# 0013 — Keep business decisions in rich domain models

## Status

Accepted. Complements [ADR 0009](0009-pupitre-domain-responsibilities.md) with interaction and lifecycle
ownership. Applies within each application's contexts, following [ADR 0012](0012-own-business-contexts-by-front.md).

## Context

The designation screen initially put numeric entry, correction, validation and expiration in an Angular
service, `DesignationDuPupitre`. These decisions governed which operator could receive the next workshop
gesture, but their enforcement depended on the screen controller. Extracting methods or passing import
boundary checks did not establish a domain owner for those rules.

The keypad also exposed a testing problem: a reset display ignored new digits while asynchronous closure
was pending, and a test expected that loss despite the functional requirement to accept the first digit.
Full coverage protected the chosen implementation without proving the requested behavior.

## Considered options

- Give state, transitions and invariants to rich domain models; keep application coordination and technical
  adapters — **kept**.
- Keep functional decisions in an Angular controller or application service over passive domain data —
  rejected: callers depend on that service remembering every invariant.
- Move the same controller into a framework-free service — rejected: removing Angular alone does not put
  behavior with the business concept that owns it.
- Put browser events, timers and storage into the domain model as well — rejected: technical mechanisms
  would couple business decisions to their execution environment.

## Decision

Model each business concept with the state and behavior needed to preserve its invariants. A rich domain
model owns meaningful transitions and decisions; it is more than a data structure manipulated by services.
Use the owning bounded context's vocabulary for its name.

Include interaction rules when they are part of the business process. A model may represent a keypad:
numeric entry, correction and explicit validation belong to the domain when the product requires them for
designation. Their appearance on a screen does not make them presentation-only. Keep browser key codes,
focus, scrolling and rendering in the primary adapter.

Use application services to obtain data through ports, coordinate asynchronous operations and publish
results. Keep timer scheduling and persistence in technical adapters. Reuse an existing coordinator when
it owns this work. Introduce a service for a distinct responsibility, rather than transferring a model's
decisions into a new service per step. This choice preserves useful services; it does not require wrapping
every read model in a class.

Enforce validity through domain decisions at business command entry points, even if the screen's timer
has not run. Supply time explicitly. Keep one authoritative lifecycle state, with the screen reflecting
its results. State whether a temporal condition applies at initiation or completion of an asynchronous
operation; that distinction is a business decision rather than an incidental consequence of an `await`.

In the pupitre's `atelier` context, `DesignationOperateur` owns the cycle from matricule entry to expiry
and owns the active `FenetreOperateur`. The latter retains qualifications, gesture preparation and its
frozen view. `OfflinePupitre` coordinates resolution and durable capture. Expiration blocks new gestures;
a gesture initiated while valid retains its operator and occurrence time while its capture completes,
subject to the existing tenant and storage checks. A reset keypad accepts new entry during closure while
validation waits for the preceding operation to finish. The operational contract remains in
[offline-pupitre.md](../offline-pupitre.md) and the context's
[AGENTS.md](../../src/main/webapp/pupitre/contexts/atelier/AGENTS.md).

Test scenarios through public contracts, keeping the real domain behind them and replacing ports or I/O
where needed. Derive expected results from the functional rule. An import or public method rename can
change test wiring; it must not change the expected business result. Test real input and visible rendering
at the component layer. Per-file coverage remains mandatory and can be achieved through the owner's
public entry point; extraction alone does not require another implementation-shaped test suite. Follow
[testing.md](../testing.md) for the procedure.

## Consequences

### Positive

- Business validity survives a delayed screen callback or a different primary adapter.
- Pure domain scenarios can exercise the complete designation cycle with explicit time and no Angular
  environment.
- Changing rendering, persistence or the internal division of work preserves the expected business results.

### Negative

- Asynchronous initiation, completion and cancellation require an explicit protocol between the domain and
  application; late results and closure ordering still need tests.
- The model's state and its published snapshot must stay consistent, adding publication work at the
  application boundary.
- A stateful model can grow too broad. Split it when independent business responsibilities emerge; revisit
  coordination when an invariant genuinely spans several owners. This decision alone does not establish
  aggregate boundaries or transaction guarantees.
