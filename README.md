# @nlozgachev/pipekit

[![npm](https://img.shields.io/npm/v/@nlozgachev/pipekit?style=for-the-badge&color=000&logo=npm&label&logoColor=fff)](https://www.npmjs.com/package/@nlozgachev/pipekit)[![JSR Version](https://img.shields.io/jsr/v/@nlozgachev/pipekit?style=for-the-badge&color=000&logo=jsr&label&logoColor=fff)](https://jsr.io/@nlozgachev/pipekit)[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/nlozgachev/pipekit/publish.yml?style=for-the-badge&color=000&logo=githubactions&label&logoColor=fff)](https://github.com/nlozgachev/pipekit/actions/workflows/publish.yml)[![Codecov](https://img.shields.io/codecov/c/github/nlozgachev/pipekit?style=for-the-badge&color=000&logo=codecov&label&logoColor=fff)](https://app.codecov.io/github/nlozgachev/pipekit)[![TypeScript](https://img.shields.io/badge/-0?style=for-the-badge&color=000&logo=typescript&label&logoColor=fff)](https://www.typescriptlang.org)[![Deno](https://img.shields.io/badge/-0?style=for-the-badge&color=000&logo=Deno&label&logoColor=fff)](https://deno.com)

Opinionated functional abstractions for TypeScript.

> **Note:** pipekit is pre-1.0. The API may change between minor versions until the 1.0 release.

```sh
# npm / pnpm / yarn / bun
npm add @nlozgachev/pipekit

# Deno
deno add jsr:@nlozgachev/pipekit
```

## What is this?

A toolkit for expressing uncertainty precisely. Instead of `T | null`, `try/catch`, and loading
state flag soup, you get types that name every possible state and make invalid ones unrepresentable.
Each type comes with a consistent set of operations — `map`, `chain`, `match`, `getOrElse` — that
compose with `pipe` and `flow`.

No FP jargon required. You won't find `Monad`, `Functor`, or `Applicative` in the API.

## What's included?

### pipekit/Core

- **`Option<A>`** — a value that may not exist; propagates absence without null checks.
- **`Result<E, A>`** — an operation that succeeds or fails with a typed error.
- **`Validation<E, A>`** — like `Result`, but accumulates every failure instead of stopping at the
  first.
- **`Task<A>`** — a lazy, infallible async operation; nothing runs until called.
- **`TaskResult<E, A>`** — a lazy async operation that can fail with a typed error.
- **`TaskOption<A>`** — a lazy async operation that may produce nothing.
- **`TaskValidation<E, A>`** — a lazy async operation that accumulates validation errors.
- **`These<E, A>`** — an inclusive OR: holds an error, a value, or both at once.
- **`RemoteData<E, A>`** — the four states of a data fetch: `NotAsked`, `Loading`, `Failure`,
  `Success`.
- **`Lens<S, A>`** — focus on a required field in a nested structure. Read, set, and modify
  immutably.
- **`Optional<S, A>`** — like `Lens`, but the target may be absent (nullable fields, array indices).
- **`Reader<R, A>`** — a computation that depends on an environment `R`, supplied once at the
  boundary.
- **`Arr`** — array utilities, data-last, returning `Option` instead of `undefined`.
- **`Rec`** — record utilities, data-last, with `Option`-returning key lookup.

### pipekit/Types

- **`Brand<K, T>`** — nominal typing at compile time, zero runtime cost.
- **`NonEmptyList<A>`** — an array guaranteed to have at least one element.

### pipekit/Composition

- **`pipe`**, **`flow`**, **`compose`** — function composition.
- **`curry`** / **`uncurry`**, **`tap`**, **`memoize`**, and other function utilities.

## Example

```ts
import { Option, Result } from "@nlozgachev/pipekit/Core";
import { pipe } from "@nlozgachev/pipekit/Composition";

// Chain nullable lookups without nested null checks
const city = pipe(
  getUser(userId), // User | null
  Option.fromNullable, // Option<User>
  Option.chain((u) => Option.fromNullable(u.address)), // Option<Address>
  Option.chain((a) => Option.fromNullable(a.city)), // Option<string>
  Option.map((c) => c.toUpperCase()), // Option<string>
  Option.getOrElse("UNKNOWN"), // string
);

// Parse input and look up a record — both steps can fail
const record = pipe(
  parseId(rawInput), // Result<ParseError, number>
  Result.chain((id) => db.find(id)), // Result<ParseError | NotFoundError, Record>
  Result.map((r) => r.name), // Result<ParseError | NotFoundError, string>
);
```

## Documentation

Full guides and API reference at **[pipekit.lozgachev.dev](https://pipekit.lozgachev.dev)**.

## License

MIT
