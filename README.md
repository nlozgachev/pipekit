# @nlozgachev/pipekit

[![npm](https://img.shields.io/npm/v/@nlozgachev/pipekit?style=for-the-badge&color=000&logo=npm&label&logoColor=fff)](https://www.npmjs.com/package/@nlozgachev/pipekit)[![JSR Version](https://img.shields.io/jsr/v/@nlozgachev/pipekit?style=for-the-badge&color=000&logo=jsr&label&logoColor=fff)](https://jsr.io/@nlozgachev/pipekit)[![TypeScript](https://img.shields.io/badge/-0?style=for-the-badge&color=000&logo=typescript&label&logoColor=fff)](https://www.typescriptlang.org)[![Deno](https://img.shields.io/badge/-0?style=for-the-badge&color=000&logo=Deno&label&logoColor=fff)](https://deno.com)

A TypeScript toolkit for writing code that means exactly what it says.

## What is this?

A TypeScript toolkit for expressing uncertainty precisely — absent values, fallible operations,
async workflows, loading states — with types that carry their own intent and operations that
compose.

Most TypeScript code encodes state as flags and nullable fields: `data | null`,
`error: Error | null`, `loading: boolean`. This works at small scale, but it pushes the burden of
knowing which combinations are valid onto every consumer. Nothing in the type system tells you that
`data` is only meaningful when `loading` is false and `error` is null — you just have to know, and
check.

This library takes a different approach: represent the state space precisely, then provide a small,
consistent set of operations to work with it. `Option` doesn't let you access a value that might not
exist without deciding what to do when it doesn't. `Result` makes it impossible to forget the error
case. `RemoteData` replaces a trio of booleans with four named, mutually exclusive states. Each type
comes with a module of functions — constructors, transformations, extractors — that follow the same
conventions (`map`, `chain`, `match`, `getOrElse`) and work with `pipe`.

The consistency means knowledge transfers: once you know `Option`, picking up `Result` or
`TaskResult` is mostly recognising the same operations in a new context. The composition means logic
reads in the order it executes. And precise types mean the compiler tracks what's possible — so you
don't have to.

## Do I need to know functional programming to use this?

No. The library avoids FP-specific jargon wherever possible. You won't find `Monad`, `Functor`, or
`Applicative` in the API. Instead, you'll work with names that describe what they do:

- `Option` — a value that might not exist
- `Result` — an operation that can succeed or fail
- `map` — transform a value inside a container
- `chain` — sequence operations that might fail
- `match` — handle each case explicitly

You can start using these right away and learn the underlying concepts as you go.

## What's included?

### pipekit/Core

Each of these is both a TypeScript type and a module of functions for working with values of that
type — constructors, transformations, and ways to extract a value back out.

- **`Option<A>`** — a value that might not exist. Replaces `T | null | undefined`. Key operations:
  `fromNullable`, `map`, `chain`, `filter`, `match`, `getOrElse`, `recover`.
- **`Result<E, A>`** — an operation that succeeds with `A` or fails with `E`. Replaces `try/catch`.
  Key operations: `tryCatch`, `map`, `mapError`, `chain`, `match`, `getOrElse`, `recover`.
- **`Validation<E, A>`** — like `Result`, but accumulates **all** errors instead of stopping at the
  first. Built for form validation. Key operations: `combine`, `combineAll`, `ap`, `map`, `match`.
- **`Task<A>`** — a lazy async operation that doesn't run until called. Key operations: `from`,
  `map`, `chain`, `all`, `delay`.
- **`TaskResult<E, A>`** — a lazy async operation that can fail. `Task` + `Result` combined. Key
  operations: `tryCatch`, `map`, `mapError`, `chain`, `match`, `recover`.
- **`TaskOption<A>`** — a lazy async operation that may return nothing. `Task` + `Option` combined.
  Replaces `Promise<T | null>`. Key operations: `tryCatch`, `map`, `chain`, `filter`, `match`,
  `getOrElse`, `toTaskResult`.
- **`TaskValidation<E, A>`** — a lazy async operation that accumulates errors. `Task` + `Validation`
  combined. Use for async form validation or parallel async checks that all need to run. Key
  operations: `tryCatch`, `map`, `chain`, `ap`, `match`, `recover`.
- **`These<E, A>`** — an inclusive-OR: holds an error, a success value, or both simultaneously.
  Unlike `Result` which is one or the other, `Both` carries a warning alongside a valid result — use
  it when partial success with diagnostics matters. Key operations: `toErr`, `toOk`, `toBoth`,
  `map`, `mapErr`, `bimap`, `chain`, `match`, `swap`, `toResult`.
- **`RemoteData<E, A>`** — models the four states of a data fetch: `NotAsked`, `Loading`, `Failure`,
  `Success`. Replaces `{ data, loading, error }` flag soup. Key operations: `notAsked`, `loading`,
  `failure`, `success`, `map`, `match`, `toResult`.
- **`Arr`** — array operations that return `Option` instead of throwing or returning `undefined`.
  Operations: `head`, `last`, `findFirst`, `findLast`, `partition`, `groupBy`, `zip`, `traverse`,
  and more.
- **`Rec`** — record/object operations. Operations: `lookup`, `map`, `filter`, `pick`, `omit`,
  `merge`, and more.

### pipekit/Types

- **`Brand<K, T>`** — nominal typing for values that share the same underlying type. Prevents
  passing a `CustomerId` where a `UserId` is expected, even though both are `string`. The brand
  exists only at compile time — zero runtime cost. Key operations: `make`, `unwrap`.
- **`NonEmptyList<A>`** — an array guaranteed to have at least one element.

### pipekit/Composition

- **`pipe`** — pass a value through a series of functions, left to right.
- **`flow`** — compose functions into a reusable pipeline (like `pipe` without an initial value).
- **`compose`** — compose functions right to left (traditional mathematical composition).
- **`curry` / `uncurry`** — convert between multi-argument and single-argument functions.
- **`tap`** — run a side effect (like logging) without breaking the pipeline.
- **`memoize`** — cache function results.
- **`identity`**, **`constant`**, **`not`**, **`and`**, **`or`**, **`once`**, **`flip`** — common
  function utilities.

## What does "composition-centric" mean?

Everything in the library is designed to work with `pipe` — a function that passes a value through a
series of transformations, top to bottom. The alternative is nesting calls inside each other, which
reads inside-out:

```ts
import { Option } from "@nlozgachev/pipekit/Core";
import { pipe } from "@nlozgachev/pipekit/Composition";

// Without pipe: execution order is the reverse of reading order
const userName = Option.getOrElse(
  Option.map(
    Option.fromNullable(users.get("123")),
    (u) => u.name,
  ),
  "Anonymous",
);

// With pipe: reads top to bottom, matches execution order
const userName = pipe(
  users.get("123"), // User | undefined
  Option.fromNullable, // Option<User>
  Option.map((u) => u.name), // Option<string>
  Option.getOrElse("Anonymous"), // string
);
```

No method chaining, no class hierarchies. Just functions that connect together.

## What does "data-last" mean and why should I care?

Every operation takes the data it operates on as the **last** argument. This means you can partially
apply them — get a function back without providing data yet — which makes `flow` work naturally.

```ts
import { Option } from "@nlozgachev/pipekit/Core";
import { flow } from "@nlozgachev/pipekit/Composition";

// Data-first: can't partially apply, so you're stuck writing wrapper functions
function formatName(user: User | null): string {
  const opt = Option.fromNullable(user);
  const name = Option.map(opt, (u) => u.name);
  return Option.getOrElse(name, "Anonymous");
}

users.map((u) => formatName(u)); // needs an arrow function wrapper

// Data-last: operations are curried, so flow connects them directly
const formatName = flow(
  Option.fromNullable<User>,
  Option.map((u) => u.name),
  Option.getOrElse("Anonymous"),
);

users.map(formatName); // no wrapper — it's already a function of User
```

## How does this help me write safer code?

The core types make invalid states unrepresentable. Instead of stacking null checks and hoping you
handled every branch, the shape of the code reflects the shape of the data:

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
    getUser(userId), // User | null
    Option.fromNullable, // Option<User>
    Option.chain((u) => Option.fromNullable(u.address)), // Option<Address>
    Option.chain((a) => Option.fromNullable(a.city)), // Option<string>
    Option.map((c) => c.toUpperCase()), // Option<string>
    Option.getOrElse("UNKNOWN"), // string
  );
}
```

`Brand` applies the same idea at the type level. When `userId` and `customerId` are both `string`,
nothing stops you from passing one where the other is expected — until you brand them:

```ts
import { Brand } from "@nlozgachev/pipekit/Types";

type UserId = Brand<"UserId", string>;
type CustomerId = Brand<"CustomerId", string>;

const toUserId = Brand.make<"UserId", string>();
const toCustomerId = Brand.make<"CustomerId", string>();

function getUser(id: UserId): User {/* ... */}

const cid = toCustomerId("c-99");
getUser(cid); // TypeError: Argument of type 'CustomerId' is not assignable to parameter of type 'UserId'
getUser(toUserId("u-42")); // ✓
```

The same idea applies to error handling with `Result`, form validation with `Validation`, async
operations with `Task`, `TaskResult`, `TaskOption`, and `TaskValidation`, and loading states with
`RemoteData`.

## How do I install it?

```sh
# Deno
deno add jsr:@nlozgachev/pipekit

# npm / pnpm / yarn / bun
npm add @nlozgachev/pipekit
```

## How do I get started?

Start with `pipe` and `Option`. These two cover the most common pain point — dealing with values
that might not exist:

```ts
import { Option } from "@nlozgachev/pipekit/Core";
import { pipe } from "@nlozgachev/pipekit/Composition";

// Read a user's preferred language from their settings, fall back to the app default
const language = pipe(
  userSettings.get(userId), // UserSettings | undefined
  Option.fromNullable, // Option<UserSettings>
  Option.map((s) => s.language), // Option<string>
  Option.getOrElse(DEFAULT_LANGUAGE), // string
);
```

Once that feels natural, reach for `Result` when operations can fail with a meaningful error —
parsing, network calls, database lookups:

```ts
import { Result } from "@nlozgachev/pipekit/Core";

// Parse user input and look up the record — both steps can fail
const record = pipe(
  parseId(rawInput), // Result<ParseError, number>
  Result.chain((id) => db.find(id)), // Result<ParseError | NotFoundError, Record>
  Result.map((r) => r.name), // Result<ParseError | NotFoundError, string>
);
```

And `Validation` when you need to collect multiple errors at once, like form validation. For async
equivalents of all three, reach for `TaskOption`, `TaskResult`, and `TaskValidation`.

## License

MIT
