---
title: Validation — collecting errors
description: Run all checks and collect every failure instead of stopping at the first one.
---

If you've ever fixed a validation error on a form, resubmitted, and been told about a *different* error — you've felt the frustration of validation that stops at the first failure. `Validation<E, A>` runs all checks and collects every failure in one pass. Users see everything wrong at once, not one problem at a time.

## The problem with short-circuiting

When validating a form, `Result`'s behavior is unhelpful:

```ts
pipe(
  validateName(form.name),
  Result.chain(() => validateEmail(form.email)),
  Result.chain(() => validateAge(form.age)),
);
```

If `validateName` fails, the pipeline stops. The user sees one error, fixes it, submits again, and sees the next one. You want to show all three errors at once.

## The Validation approach

`Validation` accumulates errors across independent checks. When you combine two invalid validations, both error lists are merged:

```ts
import { Validation } from "@nlozgachev/pipekit/Core";
import { pipe } from "@nlozgachev/pipekit/Composition";

const validateName = (name: string): Validation<string, string> =>
  name.length > 0 ? Validation.of(name) : Validation.fail("Name is required");

const validateAge = (age: number): Validation<string, number> =>
  age >= 0 ? Validation.of(age) : Validation.fail("Age must be non-negative");
```

Running both checks with `ap` collects all failures:

```ts
pipe(
  Validation.of((name: string) => (age: number) => ({ name, age })),
  Validation.ap(validateName("")),
  Validation.ap(validateAge(-1)),
);
// Invalid(["Name is required", "Age must be non-negative"])
```

If both pass, you get the assembled value:

```ts
pipe(
  Validation.of((name: string) => (age: number) => ({ name, age })),
  Validation.ap(validateName("Alice")),
  Validation.ap(validateAge(30)),
);
// Valid({ name: "Alice", age: 30 })
```

## Creating Validations

```ts
Validation.of(42);            // Valid(42)
Validation.toValid(42);       // Valid(42) — explicit alias
Validation.fail("too short"); // Invalid(["too short"]) — single error
Validation.toInvalid(["too short", "missing digits"]); // Invalid([...]) — multiple errors
```

`fail` is the most common way to create failures — it wraps a single error in a list. `toInvalid` lets you provide multiple errors directly when you already have them.

## How `ap` accumulates errors

`ap` is what sets `Validation` apart from `Result`. The pattern is: start with your constructor function wrapped in `Validation.of`, then apply each validated argument with `ap`:

```ts
// Constructor: (field1) => (field2) => (field3) => result
const build = (email: string) => (password: string) => (age: number) =>
  ({ email, password, age });

pipe(
  Validation.of(build),
  Validation.ap(validateEmail(form.email)),       // applies first arg
  Validation.ap(validatePassword(form.password)), // applies second arg
  Validation.ap(validateAge(form.age)),           // applies third arg
);
```

Each `ap` step:
- If both sides are valid, applies the function to the value
- If either side is invalid, merges both error lists into a single `Invalid`

The key property: all `ap` steps run regardless of prior failures. This is what allows all errors to be collected.

## `chain` vs `ap` — dependent vs independent

`chain` in `Validation` still short-circuits on the first error, just like `Result.chain`. Use it when later checks depend on earlier ones succeeding:

```ts
// Can only validate the format if the field is non-empty
pipe(
  validateNonEmpty(form.email),    // must pass first
  Validation.chain(validateFormat), // only runs if above passed
);
```

Use `ap` for independent checks that can all run in parallel:

```ts
// Email and password checks are independent — run both
pipe(
  Validation.of(build),
  Validation.ap(validateEmail(form.email)),
  Validation.ap(validatePassword(form.password)),
);
```

## Combining validations

`combine` merges two validations, accumulating errors if either is invalid:

```ts
Validation.combine(
  Validation.fail("Error A"),
  Validation.fail("Error B"),
); // Invalid(["Error A", "Error B"])

Validation.combine(
  Validation.of("a"),
  Validation.of("b"),
); // Valid("b") — returns the second value when both pass
```

For three or more validations, `combineAll` folds over an array:

```ts
Validation.combineAll([
  validateName(form.name),
  validateEmail(form.email),
  validateAge(form.age),
]);
// Invalid([...all errors]) or Valid(last value)
```

`combineAll` is most useful when you only need to know whether the whole set passes — the individual values are less important than the error list.

## Transforming values with `map`

`map` transforms the valid value, leaving `Invalid` untouched:

```ts
pipe(Validation.of(5),          Validation.map((n) => n * 2)); // Valid(10)
pipe(Validation.fail("oops"),   Validation.map((n) => n * 2)); // Invalid(["oops"])
```

## Extracting the value

**`getOrElse`** — provide a fallback:
```ts
pipe(Validation.of(5),        Validation.getOrElse(0)); // 5
pipe(Validation.fail("oops"), Validation.getOrElse(0)); // 0
```

**`match`** — handle each case explicitly. The invalid handler receives the full error list:
```ts
pipe(
  validation,
  Validation.match({
    valid:   (value)  => renderSuccess(value),
    invalid: (errors) => renderErrors(errors), // errors: NonEmptyList<string>
  }),
);
```

**`fold`** — same as `match` with positional arguments (invalid handler first):
```ts
pipe(
  validation,
  Validation.fold(
    (errors) => errors.join(", "),
    (value)  => `Valid: ${value}`,
  ),
);
```

## When to use Validation vs Result

Use `Validation` when:
- You're validating multiple independent fields and want all errors at once
- The consumer of your output (e.g., a form UI) needs the complete list of what went wrong

Use `Result` when:
- Each step depends on the previous one succeeding
- You want to fail fast and stop processing as soon as something goes wrong
- The operation isn't about validation — it's about control flow

In practice, many real-world scenarios mix both: use `Validation` to check individual fields, then use `Result` to sequence the side effects once the data is known to be valid.
