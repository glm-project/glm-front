# 0042 — Forbid comments in code

## Status

`Accepted`

- `Amends 0022: comments are no longer a review judgment; none is accepted, tooling directives included.`
- `Amends 0023: local/no-comments and noInlineConfig replace local/no-eslint-disable, so no comment can switch a rule off anywhere.`
- `Amends 0024: an equivalent mutant is no longer waived by a comment; the code is restructured until none remains.`

## Context

[ADR 0022](0022-keep-conventions-contextual-and-enforceable.md) turned the ban on comments into a review
judgment: a short local comment for a constraint the code could not make clear. About a hundred comments came
back across some sixty TypeScript, JavaScript, CSS and HTML files. Most restated a business rule that the
context's `AGENTS.md` already carried; four were directives read by a tool — a triple-slash reference, two
`prettier-ignore` and a `Stryker disable` waiver for an equivalent mutant.

Lint could not tell an explanation from narration, so each comment rested on review alone. Only `eslint-disable`
directives were refused, and only in `src/**/*.ts`: in a script, a template or a stylesheet, a single
`/* eslint-disable */` still silenced every rule.

## Considered options

- Refuse every comment in scripts, templates and stylesheets, and ignore inline configuration — **kept**.
- Keep comments as a review judgment — rejected: review let narration and duplicated business rules accumulate,
  and nothing stopped a directive from switching lint off outside `src/**/*.ts`.
- Refuse comments but tolerate tooling directives — rejected: each directive has a comment-free expression in
  the code or the tool's configuration, and tolerating one form of comment reopens the judgment the rule removes.
- Check stylesheets with a separate PostCSS script — rejected: a second tool beside ESLint, invisible to editors
  and to the ESLint pass of the commit hook.
- Extend the ban to Markdown, YAML and dotfiles — rejected: they are not code, ESLint does not read them, and
  the guidance the MR template hides in HTML comments is meant for its author.

## Decision

Write no comment in TypeScript, JavaScript, Angular templates — inline templates included — and CSS: no line or
block comment, no JSDoc, no tooling directive. Carry the intent in names, types, extracted predicates and
methods, and tests; put a durable rule in the topic document or the context `AGENTS.md` that owns it.

When a tool expects a directive, express the exception without one: restructure the code until an equivalent
mutant disappears, list a file in `.prettierignore`, or configure the tool.

Enforce the rule with `local/no-comments`, which reports every comment that the parser of each language exposes
in every JavaScript, TypeScript, HTML and CSS file ESLint lints. CSS is parsed by the pinned `@eslint/css`
language, to which the JavaScript recommended rules do not apply. `linterOptions.noInlineConfig` makes ESLint
ignore every inline configuration comment, so `local/no-comments` replaces `local/no-eslint-disable`. The commit
hook runs ESLint on staged stylesheets as on the other linted files.

Generated files that the repository neither commits nor lints, such as the API contract under `app/generated/`,
keep what their generator writes.

## Consequences

### Positive

- No comment can drift from the code it describes: the reader relies on names, tests and the owning document.
- One rule in one run: editors, the commit hook and CI refuse a comment in each of the four languages.
- No inline directive can disable a rule anywhere, which closes the gap left outside `src/**/*.ts`.

### Negative

- Knowledge that only a comment carried is lost unless a name, a test or a document holds it. The removal did
  not move technical explanations, such as why a calendar date is checked by rereading it, into a document.
- An equivalent mutant that no restructuring removes blocks the 100 % domain threshold. No waiver remains; such
  a case reopens this decision.
- A tool that can only be configured through a comment cannot be adopted as it stands.
- `@eslint/css` and its CSS tree join the pinned dependencies and the audit.
- Markdown, YAML and dotfiles keep their comments: the rule stops at the languages ESLint lints.
