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

## Follow the Angular idioms already in the code, not the older ones that still compile

- `inject()`, never constructor injection (`gestion/app.ts:18`, `gestion/header/header.ts:19`,
  `KeycloakOidcAuthentication.ts:9`);
- `signal()` for local component state (`App.appName`, `gestion/app.ts:17`);
- `input.required()` for what a parent gives a component (`shared/…/header/header.ts:12`);
- standalone components, no `NgModule`;
- component and directive selectors are prefixed `glm` (`glm-root`, `glm-header`) — enforced by
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
