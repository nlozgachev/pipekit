import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Task } from "../Task.ts";
import { pipe } from "../../Composition/pipe.ts";

// ---------------------------------------------------------------------------
// of
// ---------------------------------------------------------------------------

Deno.test("Task.of creates a Task that resolves to the given value", async () => {
  const result = await Task.of(42)();
  assertStrictEquals(result, 42);
});

// ---------------------------------------------------------------------------
// fail
// ---------------------------------------------------------------------------

Deno.test("Task.fail creates a Task that rejects with the given error", async () => {
  try {
    await Task.fail("boom")();
    throw new Error("Should not reach here");
  } catch (e) {
    assertStrictEquals(e, "boom");
  }
});

Deno.test("Task.fail creates a Task that rejects with an Error object", async () => {
  const err = new Error("fail");
  try {
    await Task.fail(err)();
    throw new Error("Should not reach here");
  } catch (e) {
    assertStrictEquals(e, err);
  }
});

// ---------------------------------------------------------------------------
// from
// ---------------------------------------------------------------------------

Deno.test("Task.from creates a Task from a function returning a Promise", async () => {
  const task = Task.from(() => Promise.resolve(99));
  const result = await task();
  assertStrictEquals(result, 99);
});

Deno.test("Task.from is lazy - does not execute until called", async () => {
  let executed = false;
  const task = Task.from(() => {
    executed = true;
    return Promise.resolve(1);
  });
  assertStrictEquals(executed, false);
  await task();
  assertStrictEquals(executed, true);
});

// ---------------------------------------------------------------------------
// map
// ---------------------------------------------------------------------------

Deno.test("Task.map transforms the resolved value", async () => {
  const result = await pipe(
    Task.of(5),
    Task.map((n: number) => n * 2),
  )();
  assertStrictEquals(result, 10);
});

Deno.test("Task.map can change the type", async () => {
  const result = await pipe(
    Task.of(42),
    Task.map((n: number) => `num: ${n}`),
  )();
  assertStrictEquals(result, "num: 42");
});

Deno.test("Task.map chains multiple transformations", async () => {
  const result = await pipe(
    Task.of(2),
    Task.map((n: number) => n + 3),
    Task.map((n: number) => n * 10),
  )();
  assertStrictEquals(result, 50);
});

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

Deno.test("Task.chain sequences async computations", async () => {
  const double = (n: number): Task<number> => Task.of(n * 2);
  const result = await pipe(Task.of(5), Task.chain(double))();
  assertStrictEquals(result, 10);
});

Deno.test("Task.chain can create new Tasks based on previous result", async () => {
  const fetchById = (id: number): Task<string> => Task.of(`item-${id}`);

  const result = await pipe(
    Task.of(42),
    Task.chain(fetchById),
  )();
  assertStrictEquals(result, "item-42");
});

Deno.test("Task.chain composes multiple async steps", async () => {
  const result = await pipe(
    Task.of(1),
    Task.chain((n: number) => Task.of(n + 1)),
    Task.chain((n: number) => Task.of(n * 10)),
  )();
  assertStrictEquals(result, 20);
});

// ---------------------------------------------------------------------------
// ap (value first, function second)
// ---------------------------------------------------------------------------

Deno.test("Task.ap applies a Task function to a Task value", async () => {
  const add = (a: number) => (b: number) => a + b;
  const result = await pipe(
    Task.of(add),
    Task.ap(Task.of(5)),
    Task.ap(Task.of(3)),
  )();
  assertStrictEquals(result, 8);
});

Deno.test("Task.ap runs Tasks in parallel", async () => {
  const start = Date.now();
  const slowValue: Task<number> = () => new Promise((resolve) => setTimeout(() => resolve(10), 50));
  const slowFn: Task<(n: number) => number> = () =>
    new Promise((resolve) => setTimeout(() => resolve((n: number) => n * 2), 50));

  const result = await pipe(slowFn, Task.ap(slowValue))();
  const elapsed = Date.now() - start;

  assertStrictEquals(result, 20);
  // Both should run in parallel, so total time should be around 50ms, not 100ms
  // Using 90ms as a generous upper bound
  assertStrictEquals(elapsed < 90, true);
});

Deno.test("Task.ap with single argument function", async () => {
  const double = (n: number) => n * 2;
  const result = await pipe(
    Task.of(double),
    Task.ap(Task.of(7)),
  )();
  assertStrictEquals(result, 14);
});

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

Deno.test("Task.tap executes side effect and returns original value", async () => {
  let sideEffect = 0;
  const result = await pipe(
    Task.of(5),
    Task.tap((n: number) => {
      sideEffect = n;
    }),
  )();
  assertStrictEquals(sideEffect, 5);
  assertStrictEquals(result, 5);
});

Deno.test("Task.tap does not alter the resolved value", async () => {
  const result = await pipe(
    Task.of("hello"),
    Task.tap(() => {
      // side effect that doesn't affect the value
    }),
    Task.map((s: string) => s.toUpperCase()),
  )();
  assertStrictEquals(result, "HELLO");
});

// ---------------------------------------------------------------------------
// all
// ---------------------------------------------------------------------------

Deno.test("Task.all runs multiple Tasks in parallel and collects results", async () => {
  const result = await Task.all(
    [
      Task.of(1),
      Task.of("two"),
      Task.of(true),
    ] as const,
  )();
  assertEquals(result, [1, "two", true]);
});

Deno.test("Task.all with empty array returns empty array", async () => {
  const result = await Task.all([] as const)();
  assertEquals(result, []);
});

Deno.test("Task.all preserves order regardless of completion time", async () => {
  const slow: Task<string> = () => new Promise((resolve) => setTimeout(() => resolve("slow"), 50));
  const fast: Task<string> = () => new Promise((resolve) => setTimeout(() => resolve("fast"), 10));

  const result = await Task.all([slow, fast] as const)();
  assertEquals(result, ["slow", "fast"]);
});

Deno.test("Task.all runs Tasks in parallel (not sequentially)", async () => {
  const start = Date.now();
  const t1: Task<number> = () => new Promise((resolve) => setTimeout(() => resolve(1), 50));
  const t2: Task<number> = () => new Promise((resolve) => setTimeout(() => resolve(2), 50));
  const t3: Task<number> = () => new Promise((resolve) => setTimeout(() => resolve(3), 50));

  const result = await Task.all([t1, t2, t3] as const)();
  const elapsed = Date.now() - start;

  assertEquals(result, [1, 2, 3]);
  // All 3 should run in ~50ms parallel, not 150ms sequential
  assertStrictEquals(elapsed < 100, true);
});

// ---------------------------------------------------------------------------
// delay
// ---------------------------------------------------------------------------

Deno.test("Task.delay delays the execution of a Task", async () => {
  const start = Date.now();
  const result = await pipe(Task.of(42), Task.delay(50))();
  const elapsed = Date.now() - start;

  assertStrictEquals(result, 42);
  assertStrictEquals(elapsed >= 40, true); // allow small timing variance
});

Deno.test("Task.delay with 0ms behaves like setTimeout(fn, 0)", async () => {
  const result = await pipe(Task.of("instant"), Task.delay(0))();
  assertStrictEquals(result, "instant");
});

Deno.test("Task.delay preserves the Task value after delay", async () => {
  const result = await pipe(
    Task.of(5),
    Task.delay(30),
    Task.map((n: number) => n * 2),
  )();
  assertStrictEquals(result, 10);
});

// ---------------------------------------------------------------------------
// pipe composition
// ---------------------------------------------------------------------------

Deno.test("Task composes well in a pipe chain", async () => {
  const result = await pipe(
    Task.of(5),
    Task.map((n: number) => n * 2),
    Task.chain((n: number) => Task.of(n + 1)),
    Task.map((n: number) => `result: ${n}`),
  )();
  assertStrictEquals(result, "result: 11");
});

Deno.test("Task is lazy and only executes when invoked", () => {
  let executed = false;
  const _task = pipe(
    Task.of(1),
    Task.map((_n: number) => {
      executed = true;
      return _n;
    }),
  );
  // Task not invoked yet
  assertStrictEquals(executed, false);
  // Clean up: don't actually invoke it
});

// ---------------------------------------------------------------------------
// error propagation
// ---------------------------------------------------------------------------

Deno.test("Task.map propagates rejection", async () => {
  const task = pipe(
    Task.fail<number>("boom"),
    Task.map((n: number) => n * 2),
  );
  try {
    await task();
    throw new Error("Should not reach here");
  } catch (e) {
    assertStrictEquals(e, "boom");
  }
});

Deno.test("Task.chain propagates rejection", async () => {
  const task = pipe(
    Task.fail<number>("boom"),
    Task.chain((n: number) => Task.of(n * 2)),
  );
  try {
    await task();
    throw new Error("Should not reach here");
  } catch (e) {
    assertStrictEquals(e, "boom");
  }
});

Deno.test("Task.delay propagates rejection", async () => {
  const task = pipe(
    Task.fail<number>("delayed error"),
    Task.delay(10),
  );
  try {
    await task();
    throw new Error("Should not reach here");
  } catch (e) {
    assertStrictEquals(e, "delayed error");
  }
});

Deno.test("Task.all rejects when any task fails", async () => {
  const t1 = Task.of(1);
  const t2 = Task.fail<number>("task 2 failed");
  const t3 = Task.of(3);
  try {
    await Task.all([t1, t2, t3] as const)();
    throw new Error("Should not reach here");
  } catch (e) {
    assertStrictEquals(e, "task 2 failed");
  }
});
