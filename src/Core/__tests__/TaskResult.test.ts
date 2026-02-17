import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { TaskResult } from "../TaskResult.ts";
import { pipe } from "../../Composition/pipe.ts";

// ---------------------------------------------------------------------------
// of
// ---------------------------------------------------------------------------

Deno.test("TaskResult.of creates a Task that resolves to Ok", async () => {
  const result = await TaskResult.of<string, number>(42)();
  assertEquals(result, { kind: "Ok", value: 42 });
});

// ---------------------------------------------------------------------------
// fail
// ---------------------------------------------------------------------------

Deno.test("TaskResult.fail creates a Task that resolves to Err", async () => {
  const result = await TaskResult.fail<string, number>("error")();
  assertEquals(result, { kind: "Error", error: "error" });
});

// ---------------------------------------------------------------------------
// tryCatch
// ---------------------------------------------------------------------------

Deno.test("TaskResult.tryCatch returns Ok when Promise resolves", async () => {
  const result = await TaskResult.tryCatch(
    () => Promise.resolve(42),
    (e) => `Error: ${e}`,
  )();
  assertEquals(result, { kind: "Ok", value: 42 });
});

Deno.test("TaskResult.tryCatch returns Err when Promise rejects", async () => {
  const result = await TaskResult.tryCatch(
    () => Promise.reject(new Error("boom")),
    (e) => (e as Error).message,
  )();
  assertEquals(result, { kind: "Error", error: "boom" });
});

Deno.test("TaskResult.tryCatch catches synchronous throws in async functions", async () => {
  const result = await TaskResult.tryCatch(
    // deno-lint-ignore require-await
    async () => {
      throw new Error("sync throw");
    },
    (e) => (e as Error).message,
  )();
  assertEquals(result, { kind: "Error", error: "sync throw" });
});

// ---------------------------------------------------------------------------
// map
// ---------------------------------------------------------------------------

Deno.test("TaskResult.map transforms Ok value", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.map((n: number) => n * 2),
  )();
  assertEquals(result, { kind: "Ok", value: 10 });
});

Deno.test("TaskResult.map passes through Err unchanged", async () => {
  const result = await pipe(
    TaskResult.fail<string, number>("error"),
    TaskResult.map((n: number) => n * 2),
  )();
  assertEquals(result, { kind: "Error", error: "error" });
});

Deno.test("TaskResult.map can change the value type", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(42),
    TaskResult.map((n: number) => `num: ${n}`),
  )();
  assertEquals(result, { kind: "Ok", value: "num: 42" });
});

// ---------------------------------------------------------------------------
// mapError
// ---------------------------------------------------------------------------

Deno.test("TaskResult.mapError transforms Err value", async () => {
  const result = await pipe(
    TaskResult.fail<string, number>("oops"),
    TaskResult.mapError((e: string) => e.toUpperCase()),
  )();
  assertEquals(result, { kind: "Error", error: "OOPS" });
});

Deno.test("TaskResult.mapError passes through Ok unchanged", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.mapError((e: string) => e.toUpperCase()),
  )();
  assertEquals(result, { kind: "Ok", value: 5 });
});

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

Deno.test("TaskResult.chain applies function when Ok", async () => {
  const validatePositive = (n: number): TaskResult<string, number> =>
    n > 0 ? TaskResult.of(n) : TaskResult.fail("Must be positive");

  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.chain(validatePositive),
  )();
  assertEquals(result, { kind: "Ok", value: 5 });
});

Deno.test("TaskResult.chain returns Err when function returns Err", async () => {
  const validatePositive = (n: number): TaskResult<string, number> =>
    n > 0 ? TaskResult.of(n) : TaskResult.fail("Must be positive");

  const result = await pipe(
    TaskResult.of<string, number>(-1),
    TaskResult.chain(validatePositive),
  )();
  assertEquals(result, { kind: "Error", error: "Must be positive" });
});

Deno.test("TaskResult.chain propagates Err without calling function", async () => {
  let called = false;
  const result = await pipe(
    TaskResult.fail<string, number>("error"),
    TaskResult.chain((_n: number) => {
      called = true;
      return TaskResult.of<string, number>(_n);
    }),
  )();
  assertStrictEquals(called, false);
  assertEquals(result, { kind: "Error", error: "error" });
});

Deno.test("TaskResult.chain composes multiple async steps", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(1),
    TaskResult.chain((n: number) => TaskResult.of<string, number>(n + 1)),
    TaskResult.chain((n: number) => TaskResult.of<string, number>(n * 10)),
  )();
  assertEquals(result, { kind: "Ok", value: 20 });
});

// ---------------------------------------------------------------------------
// fold
// ---------------------------------------------------------------------------

Deno.test("TaskResult.fold calls onOk for Ok", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.fold(
      (e: string) => `Error: ${e}`,
      (n: number) => `Value: ${n}`,
    ),
  )();
  assertStrictEquals(result, "Value: 5");
});

Deno.test("TaskResult.fold calls onErr for Err", async () => {
  const result = await pipe(
    TaskResult.fail<string, number>("bad"),
    TaskResult.fold(
      (e: string) => `Error: ${e}`,
      (n: number) => `Value: ${n}`,
    ),
  )();
  assertStrictEquals(result, "Error: bad");
});

// ---------------------------------------------------------------------------
// match (data-last)
// ---------------------------------------------------------------------------

Deno.test("TaskResult.match calls ok handler for Ok", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.match({
      ok: (n: number) => `got ${n}`,
      err: (e: string) => `failed: ${e}`,
    }),
  )();
  assertStrictEquals(result, "got 5");
});

Deno.test("TaskResult.match calls err handler for Err", async () => {
  const result = await pipe(
    TaskResult.fail<string, number>("bad"),
    TaskResult.match({
      ok: (n: number) => `got ${n}`,
      err: (e: string) => `failed: ${e}`,
    }),
  )();
  assertStrictEquals(result, "failed: bad");
});

Deno.test("TaskResult.match is data-last (returns a function first)", async () => {
  const handler = TaskResult.match<string, number, string>({
    ok: (n) => `val: ${n}`,
    err: (e) => `err: ${e}`,
  });
  const okResult = await handler(TaskResult.of<string, number>(3))();
  assertStrictEquals(okResult, "val: 3");
  const errResult = await handler(TaskResult.fail<string, number>("x"))();
  assertStrictEquals(errResult, "err: x");
});

// ---------------------------------------------------------------------------
// recover
// ---------------------------------------------------------------------------

Deno.test("TaskResult.recover returns original Ok without calling fallback", async () => {
  let called = false;
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.recover((_e: string) => {
      called = true;
      return TaskResult.of<string, number>(99);
    }),
  )();
  assertStrictEquals(called, false);
  assertEquals(result, { kind: "Ok", value: 5 });
});

Deno.test("TaskResult.recover provides fallback for Err", async () => {
  const result = await pipe(
    TaskResult.fail<string, number>("error"),
    TaskResult.recover((_e: string) => TaskResult.of<string, number>(99)),
  )();
  assertEquals(result, { kind: "Ok", value: 99 });
});

Deno.test("TaskResult.recover passes the error to the fallback function", async () => {
  let receivedError = "";
  await pipe(
    TaskResult.fail<string, number>("original error"),
    TaskResult.recover((e: string) => {
      receivedError = e;
      return TaskResult.of<string, number>(0);
    }),
  )();
  assertStrictEquals(receivedError, "original error");
});

// ---------------------------------------------------------------------------
// getOrElse
// ---------------------------------------------------------------------------

Deno.test("TaskResult.getOrElse returns value for Ok", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.getOrElse(0),
  )();
  assertStrictEquals(result, 5);
});

Deno.test("TaskResult.getOrElse returns default for Err", async () => {
  const result = await pipe(
    TaskResult.fail<string, number>("error"),
    TaskResult.getOrElse(0),
  )();
  assertStrictEquals(result, 0);
});

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

Deno.test("TaskResult.tap executes side effect on Ok and returns original", async () => {
  let sideEffect = 0;
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.tap((n: number) => {
      sideEffect = n;
    }),
  )();
  assertStrictEquals(sideEffect, 5);
  assertEquals(result, { kind: "Ok", value: 5 });
});

Deno.test("TaskResult.tap does not execute side effect on Err", async () => {
  let called = false;
  const result = await pipe(
    TaskResult.fail<string, number>("error"),
    TaskResult.tap((_n: number) => {
      called = true;
    }),
  )();
  assertStrictEquals(called, false);
  assertEquals(result, { kind: "Error", error: "error" });
});

// ---------------------------------------------------------------------------
// pipe composition
// ---------------------------------------------------------------------------

Deno.test("TaskResult composes well in a pipe chain", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(5),
    TaskResult.map((n: number) => n * 2),
    TaskResult.chain((n: number) =>
      n > 5 ? TaskResult.of<string, number>(n) : TaskResult.fail<string, number>("Too small")
    ),
    TaskResult.getOrElse(0),
  )();
  assertStrictEquals(result, 10);
});

Deno.test("TaskResult pipe short-circuits on Err", async () => {
  const result = await pipe(
    TaskResult.of<string, number>(2),
    TaskResult.map((n: number) => n * 2),
    TaskResult.chain((n: number) =>
      n > 5 ? TaskResult.of<string, number>(n) : TaskResult.fail<string, number>("Too small")
    ),
    TaskResult.getOrElse(0),
  )();
  assertStrictEquals(result, 0);
});

Deno.test("TaskResult tryCatch integrates with pipe chain", async () => {
  const result = await pipe(
    TaskResult.tryCatch(
      () => Promise.resolve(42),
      (e) => `Error: ${e}`,
    ),
    TaskResult.map((n: number) => n + 8),
    TaskResult.getOrElse(0),
  )();
  assertStrictEquals(result, 50);
});
