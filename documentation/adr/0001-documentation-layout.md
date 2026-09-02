# 0001 — Documentation layout: minimal CLAUDE.md, topic docs, local ADRs

## Status

Accepted

## Context

`CLAUDE.md` had reached 96 lines / 8.8 kB and is loaded into every session. Alongside it, a parallel
`BONNES-PRATIQUES.md` of 231 lines — never committed — duplicated about 60 % of its content. Two costs: a
permanent context paid on every task, whatever the task, and two sources of truth bound to diverge.

## Considered options

- Prose pointers from `CLAUDE.md` to topic docs — **kept**.
- Project skills (`.claude/skills/`) — rejected: the load-on-demand mechanism is better, but it is reserved
  for the agent; it would turn team conventions into tool configuration, unreadable in review and not
  exportable.
- `@import` in `CLAUDE.md` — rejected: always loaded, reduces nothing, only moves the file.
- `UserPromptSubmit` / `PreToolUse` hooks — rejected: deterministic injection, but configuration to maintain
  and re-injection on every turn.
- Status quo, one large `CLAUDE.md` — rejected: that is the cost being removed.
- A `docs/` folder instead of `documentation/` — rejected: the Seed4J generators write into
  `documentation/`; renaming would recreate two roots at the first `apply module`.
- Six docs mirroring the six sections — rejected: a `verification.md` would contradict the scope criterion,
  and a 12-line `authentication.md` would cost more in routing than it contains.
- ADRs as the source of truth for conventions — rejected: rule and rationale in two files, one of which is
  never loaded.
- Backfilling retroactive ADRs for decisions already embodied in the code — rejected: nobody remembers the
  alternatives actually weighed; we would produce plausible and false justifications.
- A CI check on the size of `CLAUDE.md` — rejected: a size cap is worked around by compacting lines, and the
  anti-growth instruction already lives in the one file that is always loaded.

## Decision

`CLAUDE.md` keeps only what prevents a costly mistake **before the task is even known**. When a paragraph is
borderline, nature decides: `CLAUDE.md` takes the factual (how the repo runs: commands, wiring, traps),
`documentation/` takes the normative (how we write in it).

Everything normative goes into four topic documents — `testing.md`, `architecture.md` (authentication
included), `code-style.md`, `git-and-mr.md`. The verification protocol does not move down: it stays in
`CLAUDE.md`, since it applies before any topic is chosen. The transfer is a tightened rewrite — imperative,
one to three lines per rule — except three passages kept whole, where the value is in the nuance: the
assertion procedure, the `@typescript-eslint/prefer-function-type` gotcha, and sibling components
communicating through their parent. Every produced file, ADRs included, is written in English.

The folder is `documentation/`, never `docs/`. The routing table in `CLAUDE.md` states the condition first
and the path second (`Before writing or changing a test → documentation/testing.md`), so the trigger is
recognizable without reading the target. `hexagonal-architecture.md` stays unchanged and out of the agent's
default path: it is linked once, from the first line of `architecture.md`.

ADRs live under `documentation/adr/`, likewise out of the default path, reached only through a conditional
routing line. `adr/README.md` carries the living statuses, `adr/template.md` is a trimmed MADR — `Status`,
`Context`, `Considered options`, `Decision`, `Consequences` — where negative consequences are mandatory.
Nothing is published to Confluence for this repository: the records stay versioned next to the code they
constrain. Exactly one record bootstraps the archive: this one.

Two indexes coexist: a descriptive one in `README.md` for humans, a trigger-based one in `CLAUDE.md` for the
agent. They are kept in sync by a written maintenance rule in `CLAUDE.md`, which also states that adding a
line there means naming the line it replaces. There is no CI check.

## Consequences

### Positive

- Permanent context roughly halved: 8.8 kB down to 4.1 kB loaded on every session.
- One source of truth per topic; `BONNES-PRATIQUES.md` no longer shadows `CLAUDE.md`.
- Conventions stay human-readable markdown, reviewed in MR like any other change.
- ADRs record the _why_ where the code they constrain is versioned.

### Negative

- Routing is probabilistic: nothing guarantees the agent opens `documentation/testing.md` before writing a
  test. If that proves insufficient, an ADR-0002 will reopen the choice towards skills or hooks.
- Two indexes (`README.md` and `CLAUDE.md`) can diverge; the guard is a written rule, not a tool.
- `documentation/` now hosts two architecture documents; a newcomer may open the wrong one.
- `BONNES-PRATIQUES.md` was deleted having never been committed: its pre-split state is unrecoverable.
- No automated check prevents `CLAUDE.md` from growing back; the safeguard is an instruction.
