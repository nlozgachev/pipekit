import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Result } from "../Result.ts";
import { pipe } from "../../Composition/pipe.ts";

// ---------------------------------------------------------------------------
// of / toOk
// ---------------------------------------------------------------------------

Deno.test("Result.of wraps a value in Ok", () => {
  const result = Result.of<string, number>(42);
  assertEquals(result, { kind: "Ok", value: 42 });
});

Deno.test("Result.toOk creates an Ok with the given value", () => {
  assertEquals(Result.toOk("hello"), { kind: "Ok", value: "hello" });
});

Deno.test("Result.of and Result.toOk produce equivalent results", () => {
  assertEquals(Result.of<never, number>(10), Result.toOk(10));
});

// ---------------------------------------------------------------------------
// toErr
// ---------------------------------------------------------------------------

Deno.test("Result.toErr creates an Err with the given error", () => {
  assertEquals(Result.toErr("something went wrong"), {
    kind: "Error",
    error: "something went wrong",
  });
});

Deno.test("Result.toErr works with complex error types", () => {
  const err = Result.toErr({ code: 404, message: "Not Found" });
  assertEquals(err, { kind: "Error", error: { code: 404, message: "Not Found" } });
});

// ---------------------------------------------------------------------------
// isOk / isErr
// ---------------------------------------------------------------------------

Deno.test("Result.isOk returns true for Ok", () => {
  assertStrictEquals(Result.isOk(Result.toOk(1)), true);
});

Deno.test("Result.isOk returns false for Err", () => {
  assertStrictEquals(Result.isOk(Result.toErr("e")), false);
});

Deno.test("Result.isErr returns true for Err", () => {
  assertStrictEquals(Result.isErr(Result.toErr("e")), true);
});

Deno.test("Result.isErr returns false for Ok", () => {
  assertStrictEquals(Result.isErr(Result.toOk(1)), false);
});

// ---------------------------------------------------------------------------
// tryCatch
// ---------------------------------------------------------------------------

Deno.test("Result.tryCatch returns Ok when function succeeds", () => {
  const result = Result.tryCatch(
    () => JSON.parse('{"a":1}'),
    (e) => `Parse error: ${e}`,
  );
  assertEquals(result, { kind: "Ok", value: { a: 1 } });
});

Deno.test("Result.tryCatch returns Err when function throws", () => {
  const result = Result.tryCatch(
    () => JSON.parse("invalid json!!!"),
    () => "Parse error",
  );
  assertEquals(result, { kind: "Error", error: "Parse error" });
});

Deno.test("Result.tryCatch passes the thrown error to onError", () => {
  const result = Result.tryCatch(
    () => {
      throw new Error("boom");
    },
    (e) => (e as Error).message,
  );
  assertEquals(result, { kind: "Error", error: "boom" });
});

// ---------------------------------------------------------------------------
// map
// ---------------------------------------------------------------------------

Deno.test("Result.map transforms Ok value", () => {
  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.map((n: number) => n * 2),
  );
  assertEquals(result, { kind: "Ok", value: 10 });
});

Deno.test("Result.map passes through Err unchanged", () => {
  const result = pipe(
    Result.toErr("error") as Result<string, number>,
    Result.map((n: number) => n * 2),
  );
  assertEquals(result, { kind: "Error", error: "error" });
});

Deno.test("Result.map can change the value type", () => {
  const result = pipe(
    Result.toOk(42) as Result<string, number>,
    Result.map((n: number) => `num: ${n}`),
  );
  assertEquals(result, { kind: "Ok", value: "num: 42" });
});

// ---------------------------------------------------------------------------
// mapError
// ---------------------------------------------------------------------------

Deno.test("Result.mapError transforms Err value", () => {
  const result = pipe(
    Result.toErr("oops") as Result<string, number>,
    Result.mapError((e: string) => e.toUpperCase()),
  );
  assertEquals(result, { kind: "Error", error: "OOPS" });
});

Deno.test("Result.mapError passes through Ok unchanged", () => {
  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.mapError((e: string) => e.toUpperCase()),
  );
  assertEquals(result, { kind: "Ok", value: 5 });
});

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

Deno.test("Result.chain applies function when Ok", () => {
  const validatePositive = (n: number): Result<string, number> =>
    n > 0 ? Result.toOk(n) : Result.toErr("Must be positive");

  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.chain(validatePositive),
  );
  assertEquals(result, { kind: "Ok", value: 5 });
});

Deno.test("Result.chain returns Err when function returns Err", () => {
  const validatePositive = (n: number): Result<string, number> =>
    n > 0 ? Result.toOk(n) : Result.toErr("Must be positive");

  const result = pipe(
    Result.toOk(-1) as Result<string, number>,
    Result.chain(validatePositive),
  );
  assertEquals(result, { kind: "Error", error: "Must be positive" });
});

Deno.test("Result.chain propagates Err without calling function", () => {
  let called = false;
  pipe(
    Result.toErr("error") as Result<string, number>,
    Result.chain((_n: number) => {
      called = true;
      return Result.toOk(_n) as Result<string, number>;
    }),
  );
  assertStrictEquals(called, false);
});

// ---------------------------------------------------------------------------
// fold
// ---------------------------------------------------------------------------

Deno.test("Result.fold calls onOk for Ok", () => {
  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.fold(
      (e: string) => `Error: ${e}`,
      (n: number) => `Value: ${n}`,
    ),
  );
  assertStrictEquals(result, "Value: 5");
});

Deno.test("Result.fold calls onErr for Err", () => {
  const result = pipe(
    Result.toErr("bad") as Result<string, number>,
    Result.fold(
      (e: string) => `Error: ${e}`,
      (n: number) => `Value: ${n}`,
    ),
  );
  assertStrictEquals(result, "Error: bad");
});

// ---------------------------------------------------------------------------
// match (data-last)
// ---------------------------------------------------------------------------

Deno.test("Result.match calls ok handler for Ok", () => {
  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.match({
      ok: (n: number) => `got ${n}`,
      err: (e: string) => `failed: ${e}`,
    }),
  );
  assertStrictEquals(result, "got 5");
});

Deno.test("Result.match calls err handler for Err", () => {
  const result = pipe(
    Result.toErr("bad") as Result<string, number>,
    Result.match({
      ok: (n: number) => `got ${n}`,
      err: (e: string) => `failed: ${e}`,
    }),
  );
  assertStrictEquals(result, "failed: bad");
});

Deno.test("Result.match is data-last (returns a function first)", () => {
  const handler = Result.match<string, number, string>({
    ok: (n) => `val: ${n}`,
    err: (e) => `err: ${e}`,
  });
  assertStrictEquals(handler(Result.toOk(3)), "val: 3");
  assertStrictEquals(handler(Result.toErr("x")), "err: x");
});

// ---------------------------------------------------------------------------
// getOrElse
// ---------------------------------------------------------------------------

Deno.test("Result.getOrElse returns value for Ok", () => {
  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.getOrElse(0),
  );
  assertStrictEquals(result, 5);
});

Deno.test("Result.getOrElse returns default for Err", () => {
  const result = pipe(
    Result.toErr("error") as Result<string, number>,
    Result.getOrElse(0),
  );
  assertStrictEquals(result, 0);
});

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

Deno.test("Result.tap executes side effect on Ok and returns original", () => {
  let sideEffect = 0;
  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.tap((n: number) => {
      sideEffect = n;
    }),
  );
  assertStrictEquals(sideEffect, 5);
  assertEquals(result, { kind: "Ok", value: 5 });
});

Deno.test("Result.tap does not execute side effect on Err", () => {
  let called = false;
  const result = pipe(
    Result.toErr("error") as Result<string, number>,
    Result.tap((_n: number) => {
      called = true;
    }),
  );
  assertStrictEquals(called, false);
  assertEquals(result, { kind: "Error", error: "error" });
});

// ---------------------------------------------------------------------------
// recover
// ---------------------------------------------------------------------------

Deno.test("Result.recover returns original Ok without calling fallback", () => {
  let called = false;
  const result = pipe(
    Result.toOk(5) as Result<string, number>,
    Result.recover(() => {
      called = true;
      return Result.toOk(99) as Result<string, number>;
    }),
  );
  assertStrictEquals(called, false);
  assertEquals(result, { kind: "Ok", value: 5 });
});

Deno.test("Result.recover provides fallback for Err", () => {
  const result = pipe(
    Result.toErr("error") as Result<string, number>,
    Result.recover(() => Result.toOk(99) as Result<string, number>),
  );
  assertEquals(result, { kind: "Ok", value: 99 });
});

// ---------------------------------------------------------------------------
// recoverUnless
// ---------------------------------------------------------------------------

Deno.test("Result.recoverUnless recovers when error does not match blockedErr", () => {
  const result = pipe(
    Result.toErr("recoverable") as Result<string, number>,
    Result.recoverUnless("fatal", () => Result.toOk(42) as Result<string, number>),
  );
  assertEquals(result, { kind: "Ok", value: 42 });
});

Deno.test("Result.recoverUnless does NOT recover when error matches blockedErr", () => {
  const result = pipe(
    Result.toErr("fatal") as Result<string, number>,
    Result.recoverUnless("fatal", () => Result.toOk(42) as Result<string, number>),
  );
  assertEquals(result, { kind: "Error", error: "fatal" });
});

Deno.test("Result.recoverUnless passes through Ok unchanged", () => {
  const result = pipe(
    Result.toOk(10) as Result<string, number>,
    Result.recoverUnless("fatal", () => Result.toOk(42) as Result<string, number>),
  );
  assertEquals(result, { kind: "Ok", value: 10 });
});

// ---------------------------------------------------------------------------
// ap
// ---------------------------------------------------------------------------

Deno.test("Result.ap applies Ok function to Ok value", () => {
  const add = (a: number) => (b: number) => a + b;
  const result = pipe(
    Result.of<string, typeof add>(add),
    Result.ap(Result.toOk(5) as Result<string, number>),
    Result.ap(Result.toOk(3) as Result<string, number>),
  );
  assertEquals(result, { kind: "Ok", value: 8 });
});

Deno.test("Result.ap returns Err when function is Err", () => {
  const result = pipe(
    Result.toErr("fn error") as Result<string, (a: number) => number>,
    Result.ap(Result.toOk(5) as Result<string, number>),
  );
  assertEquals(result, { kind: "Error", error: "fn error" });
});

Deno.test("Result.ap returns Err when value is Err", () => {
  const result = pipe(
    Result.of<string, (n: number) => number>((n) => n * 2),
    Result.ap(Result.toErr("val error") as Result<string, number>),
  );
  assertEquals(result, { kind: "Error", error: "val error" });
});

Deno.test("Result.ap returns first Err when both are Err", () => {
  const result = pipe(
    Result.toErr("fn error") as Result<string, (a: number) => number>,
    Result.ap(Result.toErr("val error") as Result<string, number>),
  );
  assertEquals(result, { kind: "Error", error: "fn error" });
});

// ---------------------------------------------------------------------------
// toOption
// ---------------------------------------------------------------------------

Deno.test("Result.toOption converts Ok to Some", () => {
  const result = Result.toOption(Result.toOk(42));
  assertEquals(result, { kind: "Some", value: 42 });
});

Deno.test("Result.toOption converts Err to None", () => {
  const result = Result.toOption(Result.toErr("oops"));
  assertEquals(result, { kind: "None" });
});

// ---------------------------------------------------------------------------
// pipe composition
// ---------------------------------------------------------------------------

Deno.test("Result composes well in a pipe chain", () => {
  const divide = (a: number, b: number): Result<string, number> =>
    b === 0 ? Result.toErr("Division by zero") : Result.toOk(a / b);

  const result = pipe(
    divide(10, 2),
    Result.map((n: number) => n * 3),
    Result.chain((n: number) =>
      n > 10 ? Result.toOk(n) : Result.toErr("Too small") as Result<string, number>
    ),
    Result.getOrElse(0),
  );
  assertStrictEquals(result, 15);
});

Deno.test("Result pipe short-circuits on Err", () => {
  const divide = (a: number, b: number): Result<string, number> =>
    b === 0 ? Result.toErr("Division by zero") : Result.toOk(a / b);

  const result = pipe(
    divide(10, 0),
    Result.map((n: number) => n * 3),
    Result.getOrElse(-1),
  );
  assertStrictEquals(result, -1);
});
