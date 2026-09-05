# 0008 — Extract methods to expose intent

## Status

Accepted.

## Context

PR #69 combines durable storage, gesture replay and session renewal. Several methods mix orchestration,
state transitions and failure handling, with long callbacks and nested branches. Understanding one step
requires reading the details of every other step. The existing ban on comments does not by itself make
these methods readable.

## Considered options

- Extract cohesive steps into named methods as soon as their logic obscures the caller — **kept**.
- Rely on comments to explain long methods — rejected: explanations drift and conflict with the code-style rule.
- Enforce a fixed line limit — rejected: length alone cannot distinguish a readable sequence from a short,
  deeply nested decision.
- Introduce services for every extracted step — rejected: this adds dependencies without a separate responsibility.

## Decision

Extract a method whenever a block requires its own explanation, combines levels of abstraction, or hides a
coherent decision inside nested branches or a callback. Long methods are a review signal: identify their
steps and extract the complicated ones before merging. Apply this to production code and test helpers.

Keep orchestration readable as a sequence of named operations. Give each extracted method one coherent
purpose, with an English action verb and the existing domain vocabulary. Keep it private and close to its
caller unless an existing architectural boundary requires otherwise. Do not replace a clear statement
with a forwarding method that adds no meaning.

Preserve behavior during extraction, including the time identifiers are created, evaluation of queued
callbacks, ordering of awaited operations, lock and transaction scope, and error propagation. In PR #69,
gesture identity belongs to the user action while the arrival decision belongs to queue execution; session
renewal must still inspect persisted credentials under the enrolment lock.

Use the existing behavioral tests before and after extraction. Keep behavioral changes separate, following
[the Git rules](../git-and-mr.md). Do not test private methods merely because they have been extracted.
The operational rule lives in [code-style.md](../code-style.md).

## Consequences

### Positive

- Callers expose the workflow and readers can inspect one decision at a time.
- Error handling and state transitions have names reviewers can discuss precisely.
- Existing contracts remain the verification boundary for refactoring.

### Negative

- Readers navigate between more methods and maintain more names.
- Extraction requires care around closures, asynchronous ordering and transaction lifetime.
- Review still requires judgment; a line-count check cannot prove that the chosen decomposition is useful.
