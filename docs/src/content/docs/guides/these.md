---
title: These — inclusive OR
description: Carry a warning alongside a successful result, or represent partial success with diagnostics.
---

Most operations produce one of two outcomes: a value or a failure. `These<E, A>` is for the cases that don't fit that model — when an operation partially succeeds, or succeeds but has something worth noting alongside the result. Where `Result<E, A>` is either an error *or* a value, `These<E, A>` has three variants:

- `Err(e)` — only an error, no value
- `Ok(a)` — only a value, no error
- `Both(e, a)` — an error *and* a value simultaneously

The `Both` case is what makes `These` distinct. It represents partial success: the operation produced a result, but there's also something worth noting — a warning, a degradation, a recovered fallback.

## When `Result` isn't enough

`Result` is binary: you either succeed or fail. But some operations produce a meaningful result *and* a diagnostic at the same time:

- Parsing a number from a string with extra whitespace: the number is valid, but the input was malformed
- A migration that completed with some rows skipped
- An API response that returned data but also included deprecation warnings
- A computation that succeeded using a fallback value when the primary source was unavailable

In these cases, returning `Err` discards the result. Returning `Ok` discards the warning. `Both` holds both.

## Creating These values

```ts
import { These } from "@nlozgachev/pipekit/Core";

These.toOk(42);              // Ok — success, no warning
These.toErr("bad input");    // Err — failure, no value
These.toBoth("trimmed", 42); // Both — value with a warning attached
```

A typical use: a parser that's lenient but reports what it fixed:

```ts
import { pipe } from "@nlozgachev/pipekit/Composition";

const parseNumber = (s: string): These<string, number> => {
  const trimmed = s.trim();
  const n = parseFloat(trimmed);
  if (isNaN(n)) return These.toErr("Not a number");
  if (s !== trimmed) return These.toBoth("Leading/trailing whitespace trimmed", n);
  return These.toOk(n);
};

parseNumber("  42  "); // Both("Leading/trailing whitespace trimmed", 42)
parseNumber("42");     // Ok(42)
parseNumber("abc");    // Err("Not a number")
```

## Transforming values

`map` transforms the value in `Ok` and `Both`, leaving `Err` untouched. In `Both`, the warning is preserved:

```ts
pipe(These.toOk(5),          These.map((n) => n * 2)); // Ok(10)
pipe(These.toBoth("warn", 5), These.map((n) => n * 2)); // Both("warn", 10)
pipe(These.toErr("err"),      These.map((n) => n * 2)); // Err("err")
```

`mapErr` transforms the error/warning in `Err` and `Both`, leaving `Ok` untouched:

```ts
pipe(These.toErr("warn"),      These.mapErr((e) => e.toUpperCase())); // Err("WARN")
pipe(These.toBoth("warn", 5),  These.mapErr((e) => e.toUpperCase())); // Both("WARN", 5)
```

`bimap` transforms both sides at once:

```ts
pipe(
  These.toBoth("warn", 5),
  These.bimap(
    (e) => e.toUpperCase(),
    (n) => n * 2,
  ),
); // Both("WARN", 10)
```

## Chaining

`chain` passes the value to the next step. The key behaviour is in the `Both` case: if the current state is `Both(e, a)` and the next step returns `Ok(b)`, the warning `e` is preserved in a `Both(e, b)`. The warning travels forward:

```ts
const double = (n: number): These<string, number> => These.toOk(n * 2);

pipe(These.toOk(5),           These.chain(double)); // Ok(10)
pipe(These.toBoth("warn", 5), These.chain(double)); // Both("warn", 10) — warning preserved
pipe(These.toErr("err"),      These.chain(double)); // Err("err")
```

If the next step itself returns `Both` or `Err`, that result takes precedence and the original warning from `Both` is dropped.

## Extracting the value

**`match`** — handle all three cases. Required to cover all variants:
```ts
pipe(
  result,
  These.match({
    ok:   (value)         => `Success: ${value}`,
    err:  (error)         => `Failed: ${error}`,
    both: (error, value)  => `Success with warning — ${error}: ${value}`,
  }),
);
```

**`fold`** — same with positional arguments:
```ts
pipe(
  result,
  These.fold(
    (error)        => `Failed: ${error}`,
    (value)        => `Success: ${value}`,
    (error, value) => `Partial: ${error}: ${value}`,
  ),
);
```

**`getOrElse`** — returns the value from `Ok` or `Both`, or a fallback for `Err`:
```ts
pipe(These.toOk(5),           These.getOrElse(0)); // 5
pipe(These.toBoth("warn", 5), These.getOrElse(0)); // 5
pipe(These.toErr("err"),      These.getOrElse(0)); // 0
```

## Type guards

For checking the variant directly:

```ts
These.isOk(t);    // true if Ok only
These.isErr(t);   // true if Err only
These.isBoth(t);  // true if Both

These.hasValue(t); // true if Ok or Both — value is present
These.hasError(t); // true if Err or Both — error is present
```

`hasValue` and `hasError` are useful when you care about the presence of each side independently, without needing to distinguish the exact variant.

## Converting to other types

**`toResult`** — converts to `Result`, discarding any warning from `Both`:
```ts
These.toResult(These.toOk(42));           // Ok(42)
These.toResult(These.toBoth("warn", 42)); // Ok(42) — warning dropped
These.toResult(These.toErr("err"));       // Err("err")
```

**`toOption`** — keeps only the value side:
```ts
These.toOption(These.toOk(42));           // Some(42)
These.toOption(These.toBoth("warn", 42)); // Some(42)
These.toOption(These.toErr("err"));       // None
```

**`swap`** — flips error and value roles:
```ts
These.swap(These.toErr("err"));        // Ok("err")
These.swap(These.toOk(5));             // Err(5)
These.swap(These.toBoth("warn", 5));   // Both(5, "warn")
```

## When to use These vs Result

Use `These` when:
- An operation can succeed *and* produce a diagnostic simultaneously
- You need to propagate warnings through a pipeline without losing the result
- You're building lenient parsers or processors that collect notices alongside output

Use `Result` when:
- An operation either succeeds or fails — there's no meaningful "partial" state
- You don't need to carry diagnostics alongside successful values

`These` is the less commonly reached-for type in the family. When you find yourself wanting to attach metadata, notes, or warnings to a successful result rather than just returning the result alone, that's the signal to reach for it.
