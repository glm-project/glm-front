# 0051 — Format dates through one shared convention

## Status

`Accepted`

- `Complements 0037: only the formats a production file calls exist in the shared module.`
- `Amended by [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md) on 2026-10-08: the Material date adapter, the date and time field and the skipped-hour refusal of a typed time are removed, with the only screen that used them. What still holds: the shared module, the instant / calendar day signatures, toOffsetIsoString and the lint that closes the other doors. A date or time picker added later is fed by this module again, and a new record decides its adapter.`

## Context

Seven files each built their own `Intl.DateTimeFormat` or called `toLocale*String`: one per context that shows a
date, with the locale, the hour cycle and the time zone repeated by hand. Changing how the application writes a
date meant finding every copy, and the anomaly file still showed raw ISO strings next to formatted ones. The local
current day was computed five times, once through `toLocaleDateString('en-CA')`.

Two kinds of value hide behind the word « date ». An instant (a pointage, a fact) is shown in the operator's
local time. A calendar day (`AAAA-MM-JJ`, a payroll or reading day) has no time of day: read as an instant at UTC
midnight and shown in a zone behind UTC, it falls on the previous day.

The Material date and time pickers entered gestion with the anomaly file. `NativeDateAdapter.parse` is
`new Date(Date.parse(value))`: a typed « 05/10/2026 » is read as 10 May whatever `MAT_DATE_LOCALE` says, an
impossible day rolls over silently, and Firefox starts the week on Sunday.

Local time also changes: in Europe/Paris one hour of March does not exist and one hour of October happens
twice. The project's fixed test zone, America/Sao_Paulo, has neither.

## Considered options

- Each context keeps its own `Intl.DateTimeFormat` — rejected: this is the situation that triggered the
  record. The convention drifts one context at a time and nothing says which copy is right.
- Angular's `DatePipe` and `formatDate` — rejected: the pattern language (`dd/MM/yyyy HH:mm`) names fields,
  not intents, so each template re-decides the format; the locale needs its own registration; each call
  repeats its time zone argument; and the pipe cannot be called from a script or a Material adapter, so two
  conventions would coexist.
- A shared module `app/shared/date-format`, one file of named formats, a lint rule that closes the other
  doors — **kept**.
- Keeping the Material `NativeDateAdapter` and correcting each field — rejected: `parse` is wrong for every
  field, and gestion would repeat the correction in each.
- Adding `date-fns` or Luxon for the adapter — rejected: a dependency (and its ADR) for a parse that is a
  regular expression and a round trip through `Date`.

## Decision

**One module owns the convention.** `app/shared/date-format/infrastructure/primary/DateFormats.ts` declares the
locale (`fr-FR`), the hour cycle (`h23`) and the options of every named format. A format is named in English
after what it shows (`formatInstantLongDay`, `formatCalendarDayShort`), it lives in the primary layer and nothing
sits in `domain/`, so no domain formats. Only a format a production file calls exists
([ADR 0037](0037-require-production-consumers.md)); each new one arrives with its consumer and its unit spec.

**The signature states the nature of the value.** An instant is a `Date`, shown in local time. A calendar day is
a `string` `AAAA-MM-JJ`, shown with `timeZone: 'UTC'` so it never shifts. The caller passes the value of its own
`JourCalendaire`: `app/shared` imports no context type. `localCalendarDay(date)` computes the local current day
(it computes, it does not format); the clock stays with the primary caller. `toOffsetIsoString(date)` writes an
instant typed in a field as `2026-10-01T09:41:22-03:00`, local offset, no fraction: the domain validates and
orders it, and never reads the ambient zone. The year is written only when it differs from the current one:
`formatInstantLongDay(instant, now)` receives `now`, so a spec fixes it.

**Removed on 2026-10-08, see Status.** Gestion had a Material date adapter (`provideGestionDateAdapter()`), a date and
time field and a refusal of a typed time that the clock skips. They went with the only screen that used them. The
shared module, the instant and calendar-day signatures, `toOffsetIsoString` and the lint below are what remain. A
date or time picker added later is fed by this module again, and a new record decides its adapter.

**Lint closes the other doors.** `eslint.config.mjs` refuses, through `no-restricted-syntax`,
`new Intl.DateTimeFormat(...)`, `Intl.DateTimeFormat(...)`, `toLocaleDateString`, `toLocaleTimeString` and
`toLocaleString`, and, through `no-restricted-imports`, `DatePipe` and `formatDate` from `@angular/common`. In
templates, a `date` pipe is refused by a selector on the template AST (`BindingPipe[name='date']`), inline
templates included. `no-restricted-syntax` is redefined as a whole by each boundary block, so the date
selectors are part of `restrictedSyntax()`, which every block composes; a rule added in a block of its own would
be overwritten without a warning. `app/shared/date-format/**` is the only exemption: a block placed after the
boundaries recomposes the same boundary without the date selectors, and keeps the import and effect
restrictions. `eslint/rules/date-format.spec.mjs` lints a violation of each rule in every kind of file, and
the same code inside the module.

`toLocaleString` is refused by name, so it also refuses `Number.prototype.toLocaleString`. No file called it on
a number when the rule landed; numbers are written with `Intl.NumberFormat`, which stays allowed, as does
`Intl.Collator`.

## Consequences

### Positive

- The locale, the hour cycle and each format change in one file, and the unit spec of that file states what
  each one writes.
- An instant and a calendar day cannot be confused: the type of the argument says which one the format takes.
- A new `Intl.DateTimeFormat`, `toLocale*String`, `DatePipe`, `formatDate` or `date` pipe fails lint before
  review.

### Negative

- Any date a context needs in a new shape needs a named format, a spec and a change in a shared module before
  its own code, even for one screen.
- The named formats are lists of options: they follow the host's `Intl` data, so a browser update can alter a
  separator or an abbreviation, and the specs compare strings that depend on the Node ICU version.
- The lint cannot see a format written by hand (`getDate()`, template literals), only the platform APIs; it
  does not prove that a number is not formatted as a date.
- The rule refuses `toLocaleString` on numbers too; the replacement, `Intl.NumberFormat`, is a longer
  statement.
