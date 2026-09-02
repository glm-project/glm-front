# Code style

## Code carries its own intent

**Naming replaces the comment.** When the urge to write a comment shows up, refactor: rename, extract a
function or an object. A comment survives only if it carries a _why_ that cannot be deduced from the code —
an external technical constraint. A design justification belongs in the naming, in the MR or in a README.

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

## Follow the Angular idioms already in the code, not the older ones that still compile

- `inject()`, never constructor injection (`app.ts:22`, `login.ts:12`, `oauth2-auth.service.ts:9`);
- `signal()` for local component state (`App.appName`, `app.ts:21`);
- standalone components, no `NgModule`;
- component and directive selectors are prefixed `seed` (`seed-root`, `seed-login`) — enforced by
  `angular-eslint`;
- `private readonly` for injected collaborators.

## Linting and formatting

ESLint is strict on `main/webapp/**`: `typescript-eslint` `strictTypeChecked` + `stylistic` +
`angular-eslint` recommended (`eslint.config.mjs`). A rule that fires is a design signal, not noise to
silence.

**Prettier owns formatting.** Single quotes, 140-char width, `arrowParens: avoid`. Run
`npm run prettier:format`; never hand-format. The commit hook enforces both — see
[`git-and-mr.md`](git-and-mr.md).

---

New rules on this topic go here.
