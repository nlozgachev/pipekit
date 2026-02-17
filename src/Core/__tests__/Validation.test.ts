import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Validation } from "../Validation.ts";
import { pipe } from "../../Composition/pipe.ts";

// ---------------------------------------------------------------------------
// of / toValid
// ---------------------------------------------------------------------------

Deno.test("Validation.of wraps a value in Valid", () => {
  const result = Validation.of<string, number>(42);
  assertEquals(result, { kind: "Valid", value: 42 });
});

Deno.test("Validation.toValid creates a Valid with the given value", () => {
  assertEquals(Validation.toValid("hello"), { kind: "Valid", value: "hello" });
});

Deno.test(
  "Validation.of and Validation.toValid produce equivalent results",
  () => {
    assertEquals(Validation.of<never, number>(10), Validation.toValid(10));
  },
);

// ---------------------------------------------------------------------------
// isValid
// ---------------------------------------------------------------------------

Deno.test("Validation.isValid returns true for Valid", () => {
  assertStrictEquals(
    Validation.isValid(Validation.of<string, number>(1)),
    true,
  );
});

Deno.test("Validation.isValid returns false for Invalid", () => {
  assertStrictEquals(
    Validation.isValid(Validation.fail<string, number>("err")),
    false,
  );
});

// ---------------------------------------------------------------------------
// toInvalid / isInvalid
// ---------------------------------------------------------------------------

Deno.test("Validation.toInvalid creates an Invalid with errors array", () => {
  assertEquals(Validation.toInvalid(["error1", "error2"]), {
    kind: "Invalid",
    errors: ["error1", "error2"],
  });
});

Deno.test("Validation.isInvalid returns true for Invalid", () => {
  assertStrictEquals(Validation.isInvalid(Validation.toInvalid(["e"])), true);
});

Deno.test("Validation.isInvalid returns false for Valid", () => {
  assertStrictEquals(
    Validation.isInvalid(Validation.of<string, number>(1)),
    false,
  );
});

// ---------------------------------------------------------------------------
// fail
// ---------------------------------------------------------------------------

Deno.test("Validation.fail creates an Invalid from a single error", () => {
  assertEquals(Validation.fail<string, number>("oops"), {
    kind: "Invalid",
    errors: ["oops"],
  });
});

// ---------------------------------------------------------------------------
// map
// ---------------------------------------------------------------------------

Deno.test("Validation.map transforms the valid value", () => {
  const result = pipe(
    Validation.of<string, number>(5),
    Validation.map((n: number) => n * 2),
  );
  assertEquals(result, { kind: "Valid", value: 10 });
});

Deno.test("Validation.map passes through Invalid unchanged", () => {
  const result = pipe(
    Validation.fail<string, number>("error"),
    Validation.map((n: number) => n * 2),
  );
  assertEquals(result, { kind: "Invalid", errors: ["error"] });
});

Deno.test("Validation.map can change the value type", () => {
  const result = pipe(
    Validation.of<string, number>(42),
    Validation.map((n: number) => `val: ${n}`),
  );
  assertEquals(result, { kind: "Valid", value: "val: 42" });
});

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

Deno.test("Validation.chain applies function when Valid", () => {
  const validatePositive = (n: number): Validation<string, number> =>
    n > 0 ? Validation.of(n) : Validation.fail("Must be positive");

  const result = pipe(
    Validation.of<string, number>(5),
    Validation.chain(validatePositive),
  );
  assertEquals(result, { kind: "Valid", value: 5 });
});

Deno.test("Validation.chain returns Invalid when function fails", () => {
  const validatePositive = (n: number): Validation<string, number> =>
    n > 0 ? Validation.of(n) : Validation.fail("Must be positive");

  const result = pipe(
    Validation.of<string, number>(-1),
    Validation.chain(validatePositive),
  );
  assertEquals(result, { kind: "Invalid", errors: ["Must be positive"] });
});

Deno.test(
  "Validation.chain short-circuits on Invalid (does not call function)",
  () => {
    let called = false;
    pipe(
      Validation.fail<string, number>("existing error"),
      Validation.chain((_n: number) => {
        called = true;
        return Validation.of<string, number>(_n);
      }),
    );
    assertStrictEquals(called, false);
  },
);

// ---------------------------------------------------------------------------
// ap (error accumulation)
// ---------------------------------------------------------------------------

Deno.test("Validation.ap applies Valid function to Valid value", () => {
  const add = (a: number) => (b: number) => a + b;
  const result = pipe(
    Validation.of<string, typeof add>(add),
    Validation.ap(Validation.of<string, number>(5)),
    Validation.ap(Validation.of<string, number>(3)),
  );
  assertEquals(result, { kind: "Valid", value: 8 });
});

Deno.test("Validation.ap accumulates errors from both sides", () => {
  const add = (a: number) => (b: number) => a + b;
  const result = pipe(
    Validation.of<string, typeof add>(add),
    Validation.ap(Validation.fail<string, number>("bad a")),
    Validation.ap(Validation.fail<string, number>("bad b")),
  );
  assertEquals(result, { kind: "Invalid", errors: ["bad a", "bad b"] });
});

Deno.test(
  "Validation.ap returns errors from value when function is Valid",
  () => {
    const result = pipe(
      Validation.of<string, (n: number) => number>((n) => n * 2),
      Validation.ap(Validation.fail<string, number>("bad value")),
    );
    assertEquals(result, { kind: "Invalid", errors: ["bad value"] });
  },
);

Deno.test(
  "Validation.ap returns errors from function when value is Valid",
  () => {
    const result = pipe(
      Validation.fail<string, (n: number) => number>("bad fn"),
      Validation.ap(Validation.of<string, number>(5)),
    );
    assertEquals(result, { kind: "Invalid", errors: ["bad fn"] });
  },
);

Deno.test(
  "Validation.ap accumulates all errors in a multi-field validation",
  () => {
    const createUser = (name: string) => (email: string) => (age: number) => ({
      name,
      email,
      age,
    });

    const validateName = (name: string): Validation<string, string> =>
      name.length > 0 ? Validation.of(name) : Validation.fail("Name required");
    const validateEmail = (email: string): Validation<string, string> =>
      email.includes("@") ? Validation.of(email) : Validation.fail("Invalid email");
    const validateAge = (age: number): Validation<string, number> =>
      age >= 0 ? Validation.of(age) : Validation.fail("Age must be >= 0");

    const result = pipe(
      Validation.of<string, typeof createUser>(createUser),
      Validation.ap(validateName("")),
      Validation.ap(validateEmail("bad")),
      Validation.ap(validateAge(-5)),
    );
    assertEquals(result, {
      kind: "Invalid",
      errors: ["Name required", "Invalid email", "Age must be >= 0"],
    });
  },
);

Deno.test("Validation.ap succeeds when all validations pass", () => {
  const createUser = (name: string) => (email: string) => (age: number) => ({
    name,
    email,
    age,
  });

  const result = pipe(
    Validation.of<string, typeof createUser>(createUser),
    Validation.ap(Validation.of<string, string>("Alice")),
    Validation.ap(Validation.of<string, string>("alice@example.com")),
    Validation.ap(Validation.of<string, number>(30)),
  );
  assertEquals(result, {
    kind: "Valid",
    value: { name: "Alice", email: "alice@example.com", age: 30 },
  });
});

// ---------------------------------------------------------------------------
// fold
// ---------------------------------------------------------------------------

Deno.test("Validation.fold calls onValid for Valid", () => {
  const result = pipe(
    Validation.of<string, number>(5),
    Validation.fold(
      (errors) => `Errors: ${errors.join(", ")}`,
      (n: number) => `Value: ${n}`,
    ),
  );
  assertStrictEquals(result, "Value: 5");
});

Deno.test("Validation.fold calls onInvalid for Invalid", () => {
  const result = pipe(
    Validation.toInvalid<string>(["a", "b"]) as Validation<string, number>,
    Validation.fold(
      (errors) => `Errors: ${errors.join(", ")}`,
      (n: number) => `Value: ${n}`,
    ),
  );
  assertStrictEquals(result, "Errors: a, b");
});

// ---------------------------------------------------------------------------
// match (data-last)
// ---------------------------------------------------------------------------

Deno.test("Validation.match calls valid handler for Valid", () => {
  const result = pipe(
    Validation.of<string, number>(5),
    Validation.match({
      valid: (n: number) => `got ${n}`,
      invalid: (errors) => `failed: ${errors.join(", ")}`,
    }),
  );
  assertStrictEquals(result, "got 5");
});

Deno.test("Validation.match calls invalid handler for Invalid", () => {
  const result = pipe(
    Validation.fail<string, number>("oops"),
    Validation.match({
      valid: (n: number) => `got ${n}`,
      invalid: (errors) => `failed: ${errors.join(", ")}`,
    }),
  );
  assertStrictEquals(result, "failed: oops");
});

Deno.test("Validation.match is data-last (returns a function first)", () => {
  const handler = Validation.match<string, number, string>({
    valid: (n) => `val: ${n}`,
    invalid: (errors) => `err: ${errors.join(";")}`,
  });
  assertStrictEquals(handler(Validation.of(3)), "val: 3");
  assertStrictEquals(handler(Validation.fail("x")), "err: x");
});

// ---------------------------------------------------------------------------
// getOrElse
// ---------------------------------------------------------------------------

Deno.test("Validation.getOrElse returns value for Valid", () => {
  const result = pipe(
    Validation.of<string, number>(5),
    Validation.getOrElse(0),
  );
  assertStrictEquals(result, 5);
});

Deno.test("Validation.getOrElse returns default for Invalid", () => {
  const result = pipe(
    Validation.fail<string, number>("error"),
    Validation.getOrElse(0),
  );
  assertStrictEquals(result, 0);
});

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

Deno.test(
  "Validation.tap executes side effect on Valid and returns original",
  () => {
    let sideEffect = 0;
    const result = pipe(
      Validation.of<string, number>(5),
      Validation.tap((n: number) => {
        sideEffect = n;
      }),
    );
    assertStrictEquals(sideEffect, 5);
    assertEquals(result, { kind: "Valid", value: 5 });
  },
);

Deno.test("Validation.tap does not execute side effect on Invalid", () => {
  let called = false;
  const result = pipe(
    Validation.fail<string, number>("error"),
    Validation.tap((_n: number) => {
      called = true;
    }),
  );
  assertStrictEquals(called, false);
  assertEquals(result, { kind: "Invalid", errors: ["error"] });
});

// ---------------------------------------------------------------------------
// recover
// ---------------------------------------------------------------------------

Deno.test(
  "Validation.recover returns original Valid without calling fallback",
  () => {
    let called = false;
    const result = pipe(
      Validation.of<string, number>(5),
      Validation.recover(() => {
        called = true;
        return Validation.of<string, number>(99);
      }),
    );
    assertStrictEquals(called, false);
    assertEquals(result, { kind: "Valid", value: 5 });
  },
);

Deno.test("Validation.recover provides fallback for Invalid", () => {
  const result = pipe(
    Validation.fail<string, number>("error"),
    Validation.recover(() => Validation.of<string, number>(99)),
  );
  assertEquals(result, { kind: "Valid", value: 99 });
});

Deno.test("Validation.recover can return Invalid as fallback", () => {
  const result = pipe(
    Validation.fail<string, number>("first"),
    Validation.recover(() => Validation.fail<string, number>("second")),
  );
  assertEquals(result, { kind: "Invalid", errors: ["second"] });
});

// ---------------------------------------------------------------------------
// recoverUnless
// ---------------------------------------------------------------------------

Deno.test(
  "Validation.recoverUnless recovers when errors do not include blocked errors",
  () => {
    const result = pipe(
      Validation.fail<string, number>("recoverable"),
      Validation.recoverUnless(["fatal"], () => Validation.of<string, number>(42)),
    );
    assertEquals(result, { kind: "Valid", value: 42 });
  },
);

Deno.test(
  "Validation.recoverUnless does NOT recover when errors include a blocked error",
  () => {
    const result = pipe(
      Validation.fail<string, number>("fatal"),
      Validation.recoverUnless(["fatal"], () => Validation.of<string, number>(42)),
    );
    assertEquals(result, { kind: "Invalid", errors: ["fatal"] });
  },
);

Deno.test("Validation.recoverUnless passes through Valid unchanged", () => {
  const result = pipe(
    Validation.of<string, number>(10),
    Validation.recoverUnless(["fatal"], () => Validation.of<string, number>(42)),
  );
  assertEquals(result, { kind: "Valid", value: 10 });
});

Deno.test(
  "Validation.recoverUnless does NOT recover when any error matches blocked list",
  () => {
    const result = pipe(
      Validation.toInvalid(["minor", "fatal"]) as Validation<string, number>,
      Validation.recoverUnless(["fatal"], () => Validation.of<string, number>(42)),
    );
    assertEquals(result, { kind: "Invalid", errors: ["minor", "fatal"] });
  },
);

// ---------------------------------------------------------------------------
// combine
// ---------------------------------------------------------------------------

Deno.test("Validation.combine returns second Valid when both are Valid", () => {
  const result = Validation.combine(
    Validation.of<string, string>("a"),
    Validation.of<string, string>("b"),
  );
  assertEquals(result, { kind: "Valid", value: "b" });
});

Deno.test("Validation.combine returns Invalid when first is Invalid", () => {
  const result = Validation.combine(
    Validation.fail<string, string>("err1"),
    Validation.of<string, string>("b"),
  );
  assertEquals(result, { kind: "Invalid", errors: ["err1"] });
});

Deno.test("Validation.combine returns Invalid when second is Invalid", () => {
  const result = Validation.combine(
    Validation.of<string, string>("a"),
    Validation.fail<string, string>("err2"),
  );
  assertEquals(result, { kind: "Invalid", errors: ["err2"] });
});

Deno.test("Validation.combine accumulates errors when both are Invalid", () => {
  const result = Validation.combine(
    Validation.fail<string, string>("err1"),
    Validation.fail<string, string>("err2"),
  );
  assertEquals(result, { kind: "Invalid", errors: ["err1", "err2"] });
});

Deno.test(
  "Validation.combine accumulates multiple errors from both sides",
  () => {
    const result = Validation.combine(
      Validation.toInvalid(["a", "b"]) as Validation<string, number>,
      Validation.toInvalid(["c"]) as Validation<string, number>,
    );
    assertEquals(result, { kind: "Invalid", errors: ["a", "b", "c"] });
  },
);

// ---------------------------------------------------------------------------
// combineAll
// ---------------------------------------------------------------------------

Deno.test("Validation.combineAll returns last Valid when all are Valid", () => {
  const result = Validation.combineAll([
    Validation.of<string, number>(1),
    Validation.of<string, number>(2),
    Validation.of<string, number>(3),
  ]);
  assertEquals(result, { kind: "Valid", value: 3 });
});

Deno.test("Validation.combineAll accumulates all errors", () => {
  const result = Validation.combineAll([
    Validation.fail<string, number>("err1"),
    Validation.of<string, number>(2),
    Validation.fail<string, number>("err2"),
  ]);
  assertEquals(result, { kind: "Invalid", errors: ["err1", "err2"] });
});

Deno.test(
  "Validation.combineAll with all Invalid accumulates all errors",
  () => {
    const result = Validation.combineAll([
      Validation.fail<string, number>("a"),
      Validation.fail<string, number>("b"),
      Validation.fail<string, number>("c"),
    ]);
    assertEquals(result, { kind: "Invalid", errors: ["a", "b", "c"] });
  },
);

Deno.test(
  "Validation.combineAll with single element returns that element",
  () => {
    const result = Validation.combineAll([Validation.of<string, number>(42)]);
    assertEquals(result, { kind: "Valid", value: 42 });
  },
);

Deno.test("Validation.combineAll returns undefined for empty array", () => {
  const result = Validation.combineAll<string, number>([]);
  assertStrictEquals(result, undefined);
});

// ---------------------------------------------------------------------------
// pipe composition
// ---------------------------------------------------------------------------

Deno.test("Validation composes well in a pipe chain", () => {
  const result = pipe(
    Validation.of<string, number>(5),
    Validation.map((n: number) => n * 2),
    Validation.chain((n: number) =>
      n > 5 ? Validation.of<string, number>(n) : Validation.fail<string, number>("Too small")
    ),
    Validation.getOrElse(0),
  );
  assertStrictEquals(result, 10);
});

Deno.test("Validation pipe chain with Invalid short-circuits in chain", () => {
  const result = pipe(
    Validation.of<string, number>(2),
    Validation.map((n: number) => n * 2),
    Validation.chain((n: number) =>
      n > 5 ? Validation.of<string, number>(n) : Validation.fail<string, number>("Too small")
    ),
    Validation.getOrElse(0),
  );
  assertStrictEquals(result, 0);
});
