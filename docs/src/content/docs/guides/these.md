---
title: These — inclusive OR
description: Hold a first value, a second value, or both simultaneously — without implying success or failure.
---

Most operations produce one of two outcomes. `These<A, B>` is for the cases where both can exist
at once. Where `Result<E, A>` is either an error _or_ a value, `These<A, B>` has three variants:

- `First(a)` — only a first value
- `Second(b)` — only a second value
- `Both(a, b)` — both a first and a second value simultaneously

Neither side carries a success or failure connotation. `These` is a neutral inclusive-OR pair:
any combination is valid, and neither side is privileged.

## When two sides coexist

Some operations naturally produce two pieces of information at once:

- Parsing a number from a string with extra whitespace: the number is valid, and the input was
  malformed
- A migration that completed with some rows skipped
- An API response that returned data and also included deprecation notices
- A computation that succeeded using a fallback when the primary source was unavailable

In these cases, discarding either piece loses information. `Both` holds them together.

## Creating These values

```ts
import { These } from "@nlozgachev/pipekit/Core";

These.first(42);            // First — only a first value
These.second("bad input");  // Second — only a second value
These.both(42, "trimmed");  // Both — first and second simultaneously
```

A typical use: a parser that's lenient but records what it fixed:

```ts
import { pipe } from "@nlozgachev/pipekit/Composition";

const parseNumber = (s: string): These<number, string> => {
  const trimmed = s.trim();
  const n = parseFloat(trimmed);
  if (isNaN(n)) return These.second("Not a number");
  if (s !== trimmed) return These.both(n, "Leading/trailing whitespace trimmed");
  return These.first(n);
};

parseNumber("  42  "); // Both(42, "Leading/trailing whitespace trimmed")
parseNumber("42");     // First(42)
parseNumber("abc");    // Second("Not a number")
```

## Transforming values

`mapFirst` transforms the first value in `First` and `Both`, leaving `Second` untouched. In
`Both`, the second value is preserved:

```ts
pipe(These.first(5), These.mapFirst((n) => n * 2));           // First(10)
pipe(These.both(5, "warn"), These.mapFirst((n) => n * 2));    // Both(10, "warn")
pipe(These.second("warn"), These.mapFirst((n) => n * 2));     // Second("warn")
```

`mapSecond` transforms the second value in `Second` and `Both`, leaving `First` untouched:

```ts
pipe(These.second("warn"), These.mapSecond((e) => e.toUpperCase())); // Second("WARN")
pipe(These.both(5, "warn"), These.mapSecond((e) => e.toUpperCase())); // Both(5, "WARN")
```

`bimap` transforms both sides at once:

```ts
pipe(
  These.both(5, "warn"),
  These.bimap(
    (n) => n * 2,
    (e) => e.toUpperCase(),
  ),
); // Both(10, "WARN")
```

## Chaining

`chain` passes the first value to the next step. The key behaviour is in the `Both` case: if the
current state is `Both(a, b)` and the next step returns `First(c)`, the second value `b` is
preserved in a `Both(c, b)`. The second value travels forward:

```ts
const double = (n: number): These<number, string> => These.first(n * 2);

pipe(These.first(5), These.chain(double));            // First(10)
pipe(These.both(5, "warn"), These.chain(double));     // Both(10, "warn") — second preserved
pipe(These.second("warn"), These.chain(double));      // Second("warn")
```

If the next step itself returns `Both` or `Second`, that result is returned as-is and the
original second value from `Both` is dropped.

## Extracting the value

**`match`** — handle all three cases. Required to cover all variants:

```ts
pipe(
  result,
  These.match({
    first: (value) => `First: ${value}`,
    second: (note) => `Second: ${note}`,
    both: (value, note) => `Both — ${note}: ${value}`,
  }),
);
```

**`fold`** — same with positional arguments:

```ts
pipe(
  result,
  These.fold(
    (value) => `First: ${value}`,
    (note) => `Second: ${note}`,
    (value, note) => `Both: ${value} / ${note}`,
  ),
);
```

**`getOrElse`** — returns the first value from `First` or `Both`, or a fallback for `Second`:

```ts
pipe(These.first(5), These.getOrElse(0));            // 5
pipe(These.both(5, "warn"), These.getOrElse(0));     // 5
pipe(These.second("warn"), These.getOrElse(0));      // 0
```

## Type guards

For checking the variant directly:

```ts
These.isFirst(t);   // true if First only
These.isSecond(t);  // true if Second only
These.isBoth(t);    // true if Both

These.hasFirst(t);  // true if First or Both — first value is present
These.hasSecond(t); // true if Second or Both — second value is present
```

`hasFirst` and `hasSecond` are useful when you care about the presence of each side
independently, without needing to distinguish the exact variant.

## Converting to Option

**`toOption`** — keeps only the first value side:

```ts
These.toOption(These.first(42));           // Some(42)
These.toOption(These.both(42, "warn"));    // Some(42)
These.toOption(These.second("warn"));      // None
```

**`swap`** — flips first and second roles:

```ts
These.swap(These.second("warn")); // First("warn")
These.swap(These.first(5));       // Second(5)
These.swap(These.both(5, "warn")); // Both("warn", 5)
```

## When to use These

Use `These` when:

- An operation can produce two pieces of information simultaneously
- You need to propagate a secondary note through a pipeline without losing the primary result
- You're building lenient parsers or processors that collect diagnostics alongside output

`These` is the less commonly reached-for type in the family. When you find yourself wanting to
carry two independent pieces of data — where either or both may be present — that's the signal
to reach for it.
