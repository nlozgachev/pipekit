# @nlozgachev/fp-lib

[![npm](https://img.shields.io/npm/v/@nlozgachev/fp-lib?style=for-the-badge&color=000&logo=npm&label&logoColor=fff)](https://www.npmjs.com/package/@nlozgachev/fp-lib)[![JSR Version](https://img.shields.io/jsr/v/@nlozgachev/fp-lib?style=for-the-badge&color=000&logo=jsr&label&logoColor=fff)](https://jsr.io/@nlozgachev/fp-lib)[![TypeScript](https://img.shields.io/badge/-white?style=for-the-badge&color=000&logo=typescript&label&logoColor=fff)](https://www.typescriptlang.org)[![Deno](https://img.shields.io/badge/-white?style=for-the-badge&color=000&logo=Deno&label&logoColor=fff)](https://deno.com)

A functional programming toolkit for TypeScript that speaks your language.

## What is this?

A collection of types and utilities that help you write safer, composition-centric, more predictable TypeScript. If you've ever dealt with `null` checks scattered across your codebase, nested `try/catch` blocks, or `{ data: T | null; loading: boolean; error: Error | null }` — this library gives you better tools for all of that.

## Do I need to know functional programming to use this?

No. The library avoids FP-specific jargon wherever possible. You won't find `Monad`, `Functor`, or `Applicative` in the API. Instead, you'll work with names that describe what they do:

- `Option` — a value that might not exist
- `Result` — an operation that can succeed or fail
- `map` — transform a value inside a container
- `chain` — sequence operations that might fail
- `match` — handle each case explicitly

You can start using these right away and learn the underlying concepts as you go.

## What's included?

### fp-lib/Core

Each of these is both a TypeScript type and a module of functions for working with values of that type — constructors, transformations, and ways to extract a value back out.

- **`Option<A>`** — a value that might not exist. Replaces `T | null | undefined`. Key operations: `fromNullable`, `map`, `chain`, `filter`, `match`, `getOrElse`, `recover`.
- **`Result<E, A>`** — an operation that succeeds with `A` or fails with `E`. Replaces `try/catch`. Key operations: `tryCatch`, `map`, `mapError`, `chain`, `match`, `getOrElse`, `recover`.
- **`Validation<E, A>`** — like `Result`, but accumulates **all** errors instead of stopping at the first. Built for form validation. Key operations: `combine`, `combineAll`, `ap`, `map`, `match`.
- **`Task<A>`** — a lazy async operation that doesn't run until called. Key operations: `from`, `map`, `chain`, `all`, `delay`.
- **`TaskResult<E, A>`** — a lazy async operation that can fail. `Task` + `Result` combined. Key operations: `tryCatch`, `map`, `mapError`, `chain`, `match`, `recover`.
- **`RemoteData<E, A>`** — models the four states of a data fetch: `NotAsked`, `Loading`, `Failure`, `Success`. Replaces `{ data, loading, error }` flag soup. Key operations: `notAsked`, `loading`, `failure`, `success`, `map`, `match`, `toResult`.
- **`Arr`** — array operations that return `Option` instead of throwing or returning `undefined`. Operations: `head`, `last`, `findFirst`, `findLast`, `partition`, `groupBy`, `zip`, `traverse`, and more.
- **`Rec`** — record/object operations. Operations: `lookup`, `map`, `filter`, `pick`, `omit`, `merge`, and more.

### fp-lib/Types

- **`NonEmptyList<A>`** — an array guaranteed to have at least one element.

### fp-lib/Composition

- **`pipe`** — pass a value through a series of functions, left to right.
- **`flow`** — compose functions into a reusable pipeline (like `pipe` without an initial value).
- **`compose`** — compose functions right to left (traditional mathematical composition).
- **`curry` / `uncurry`** — convert between multi-argument and single-argument functions.
- **`tap`** — run a side effect (like logging) without breaking the pipeline.
- **`memoize`** — cache function results.
- **`identity`**, **`constant`**, **`not`**, **`and`**, **`or`**, **`once`**, **`flip`** — common function utilities.

## What does "composition-centric" mean?

Everything in the library is designed to work with `pipe` — a function that passes a value through a series of transformations, top to bottom. The alternative is nesting calls inside each other, which reads inside-out:

```ts
import { Option } from "@nlozgachev/fp-lib/Core";
import { pipe } from "@nlozgachev/fp-lib/Composition";

// Without pipe: execution order is the reverse of reading order
const userName = Option.getOrElse(
  Option.map(
    Option.fromNullable(users.get("123")),
    u => u.name
  ),
  "Anonymous"
);

// With pipe: reads top to bottom, matches execution order
const userName = pipe(
  users.get("123"),              // User | undefined
  Option.fromNullable,           // Option<User>
  Option.map(u => u.name),       // Option<string>
  Option.getOrElse("Anonymous")  // string
);
```

No method chaining, no class hierarchies. Just functions that connect together.

## What does "data-last" mean and why should I care?

Every operation takes the data it operates on as the **last** argument. This means you can partially apply them — get a function back without providing data yet — which makes `flow` work naturally.

```ts
import { Option } from "@nlozgachev/fp-lib/Core";
import { flow } from "@nlozgachev/fp-lib/Composition";

// Data-first: can't partially apply, so you're stuck writing wrapper functions
function formatName(user: User | null): string {
  const opt = Option.fromNullable(user);
  const name = Option.map(opt, u => u.name);
  return Option.getOrElse(name, "Anonymous");
}

users.map(u => formatName(u)); // needs an arrow function wrapper

// Data-last: operations are curried, so flow connects them directly
const formatName = flow(
  Option.fromNullable<User>,
  Option.map(u => u.name),
  Option.getOrElse("Anonymous")
);

users.map(formatName); // no wrapper — it's already a function of User
```

## How does this help me write safer code?

The core types make invalid states unrepresentable. Instead of stacking null checks and hoping you handled every branch, the shape of the code reflects the shape of the data:

```ts
// Before: null handling that doesn't scale
function getDisplayCity(userId: string): string {
  const user = getUser(userId);
  if (user === null) return "UNKNOWN";
  if (user.address === null) return "UNKNOWN";
  if (user.address.city === null) return "UNKNOWN";
  return user.address.city.toUpperCase();
}

// After: flat, readable, same guarantees
function getDisplayCity(userId: string): string {
  return pipe(
    getUser(userId),                                        // User | null
    Option.fromNullable,                                    // Option<User>
    Option.chain(u => Option.fromNullable(u.address)),      // Option<Address>
    Option.chain(a => Option.fromNullable(a.city)),         // Option<string>
    Option.map(c => c.toUpperCase()),                       // Option<string>
    Option.getOrElse("UNKNOWN")                             // string
  );
}
```

The same idea applies to error handling with `Result`, form validation with `Validation`, async operations with `Task` and `TaskResult`, and loading states with `RemoteData`.



## How do I install it?

```sh
# Deno
deno add jsr:@nlozgachev/fp-lib

# npm / pnpm / yarn / bun
npm add @nlozgachev/fp-lib
```

## How do I get started?

Start with `pipe` and `Option`. These two cover the most common pain point — dealing with values that might not exist:

```ts
import { Option } from "@nlozgachev/fp-lib/Core";
import { pipe } from "@nlozgachev/fp-lib/Composition";

// Read a user's preferred language from their settings, fall back to the app default
const language = pipe(
  userSettings.get(userId),          // UserSettings | undefined
  Option.fromNullable,               // Option<UserSettings>
  Option.map(s => s.language),       // Option<string>
  Option.getOrElse(DEFAULT_LANGUAGE) // string
);
```

Once that feels natural, reach for `Result` when operations can fail with a meaningful error — parsing, network calls, database lookups:

```ts
import { Result } from "@nlozgachev/fp-lib/Core";

// Parse user input and look up the record — both steps can fail
const record = pipe(
  parseId(rawInput),                 // Result<ParseError, number>
  Result.chain(id => db.find(id)),   // Result<ParseError | NotFoundError, Record>
  Result.map(r => r.name),           // Result<ParseError | NotFoundError, string>
);
```

And `Validation` when you need to collect multiple errors at once, like form validation.

## License

MIT