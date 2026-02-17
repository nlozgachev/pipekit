# @nlozgachev/fp-lib

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

etc.

You can start using these types and functions right away, and learn the underlying concepts as you go.

## What does "composition-centric" mean?

Everything in the library is designed to work with `pipe` — a function that passes a value through a series of transformations, top to bottom:

```ts
import { pipe, Option } from "@nlozgachev/fp-lib";

const userName = pipe(
  users.get("123"),          // User | undefined
  Option.fromNullable,       // Option<User>
  Option.map(u => u.name),   // Option<string>
  Option.getOrElse("Anonymous")  // string
);
```

No method chaining, no class hierarchies. Just functions that connect together.

## What does "data-last" mean and why should I care?

Every operation takes the data it operates on as the **last** argument. This means you can build reusable pipelines without specifying the data upfront:

```ts
import { flow, Option } from "@nlozgachev/fp-lib";

// Create a reusable transformation — no data yet
const getDisplayName = flow(
  Option.fromNullable,
  Option.map((u: User) => u.name),
  Option.getOrElse("Anonymous")
);

// Use it wherever you need
getDisplayName(user1);
getDisplayName(user2);
```

In a "data-first" style, you'd have to repeat the logic or manually wrap it. Data-last makes composition free.

## How does this help me write safer code?

The core types make invalid states unrepresentable. Instead of checking for `null` at runtime and hoping you didn't miss a spot, the type system does the work:

```ts
// Before: runtime errors hiding everywhere
const user = getUser(id);          // User | null
const name = user.name;            // Runtime error if null
const upper = name.toUpperCase();

// After: the compiler won't let you forget
pipe(
  getUser(id),                     // Option<User>
  Option.map(u => u.name),         // Option<string>
  Option.map(s => s.toUpperCase()),// Option<string>
  Option.getOrElse("UNKNOWN")     // string — always safe
);
```

The same idea applies to error handling with `Result`, form validation with `Validation`, async operations with `Task` and `TaskResult`, and loading states with `RemoteData`.

## What types are included?

### Core types

- **`Option<A>`** — a value that might not exist. Replaces `T | null | undefined`.
- **`Result<E, A>`** — an operation that succeeds with `A` or fails with `E`. Replaces `try/catch` and error-prone union types.
- **`Validation<E, A>`** — like `Result`, but collects **all** errors instead of stopping at the first one. Built for form validation.
- **`Task<A>`** — a lazy async operation. A `Promise` that doesn't run until you tell it to.
- **`TaskResult<E, A>`** — a lazy async operation that can fail. Combines `Task` + `Result`.
- **`RemoteData<E, A>`** — models the four states of a data fetch: not asked, loading, failure, success. Replaces boolean flag soup.

### Utilities

- **`Arr`** — functional array operations (`head`, `findFirst`, `groupBy`, `partition`, etc.) that return `Option` instead of `undefined`.
- **`Rec`** — functional record/object operations (`lookup`, `map`, `filter`, `pick`, `omit`, etc.).
- **`NonEmptyList<A>`** — an array guaranteed to have at least one element.

### Composition

- **`pipe`** — pass a value through a series of functions, left to right.
- **`flow`** — compose functions into a reusable pipeline (like `pipe` without an initial value).
- **`compose`** — compose functions right to left (traditional mathematical composition).
- **`curry` / `uncurry`** — convert between multi-argument and single-argument functions.
- **`tap`** — run a side effect (like logging) without breaking the pipeline.
- **`memoize`** — cache function results.
- **`identity`**, **`constant`**, **`not`**, **`and`**, **`or`**, **`once`**, **`flip`** — common function utilities.

## How do I install it?

```sh
# Deno
deno add jsr:@nlozgachev/fp-lib

# npm (via jsr)
npx jsr add @nlozgachev/fp-lib
```

## How do I get started?

Start with `pipe` and `Option`. These two cover the most common pain point — dealing with values that might not exist:

```ts
import { pipe, Option } from "@nlozgachev/fp-lib";

// Safely access nested optional data
const city = pipe(
  getUser(id),
  Option.map(u => u.address),
  Option.chain(a => Option.fromNullable(a.city)),
  Option.getOrElse("Unknown")
);
```

Once that feels natural, reach for `Result` when you need error handling, and `Validation` when you need to collect multiple errors at once.

## License

MIT