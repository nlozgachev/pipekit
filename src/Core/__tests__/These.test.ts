import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Both, These } from "../These.ts";
import { pipe } from "../../Composition/pipe.ts";

// ---------------------------------------------------------------------------
// toErr / toOk / toBoth
// ---------------------------------------------------------------------------

Deno.test("These.toErr creates a These with only an error", () => {
  assertEquals(These.toErr("oops"), { kind: "Error", error: "oops" });
});

Deno.test("These.toOk creates a These with only a value", () => {
  assertEquals(These.toOk(42), { kind: "Ok", value: 42 });
});

Deno.test("These.toBoth creates a These with both error and value", () => {
  const result: Both<string, number> = These.toBoth("warn", 42);
  assertEquals(result, { kind: "Both", error: "warn", value: 42 });
});

// ---------------------------------------------------------------------------
// isErr / isOk / isBoth
// ---------------------------------------------------------------------------

Deno.test("These.isErr returns true for toErr", () => {
  assertStrictEquals(These.isErr(These.toErr("e")), true);
});

Deno.test("These.isErr returns false for toOk", () => {
  assertStrictEquals(These.isErr(These.toOk(1)), false);
});

Deno.test("These.isErr returns false for toBoth", () => {
  assertStrictEquals(These.isErr(These.toBoth("w", 1)), false);
});

Deno.test("These.isOk returns true for toOk", () => {
  assertStrictEquals(These.isOk(These.toOk(1)), true);
});

Deno.test("These.isOk returns false for toErr", () => {
  assertStrictEquals(These.isOk(These.toErr("e")), false);
});

Deno.test("These.isOk returns false for toBoth", () => {
  assertStrictEquals(These.isOk(These.toBoth("w", 1)), false);
});

Deno.test("These.isBoth returns true for toBoth", () => {
  assertStrictEquals(These.isBoth(These.toBoth("w", 1)), true);
});

Deno.test("These.isBoth returns false for toErr", () => {
  assertStrictEquals(These.isBoth(These.toErr("e")), false);
});

Deno.test("These.isBoth returns false for toOk", () => {
  assertStrictEquals(These.isBoth(These.toOk(1)), false);
});

// ---------------------------------------------------------------------------
// hasValue / hasError
// ---------------------------------------------------------------------------

Deno.test("These.hasValue returns false for Err", () => {
  assertStrictEquals(These.hasValue(These.toErr("e")), false);
});

Deno.test("These.hasValue returns true for Ok", () => {
  assertStrictEquals(These.hasValue(These.toOk(1)), true);
});

Deno.test("These.hasValue returns true for Both", () => {
  assertStrictEquals(These.hasValue(These.toBoth("w", 1)), true);
});

Deno.test("These.hasError returns true for Err", () => {
  assertStrictEquals(These.hasError(These.toErr("e")), true);
});

Deno.test("These.hasError returns false for Ok", () => {
  assertStrictEquals(These.hasError(These.toOk(1)), false);
});

Deno.test("These.hasError returns true for Both", () => {
  assertStrictEquals(These.hasError(These.toBoth("w", 1)), true);
});

// ---------------------------------------------------------------------------
// map
// ---------------------------------------------------------------------------

Deno.test("These.map transforms Ok value", () => {
  assertEquals(
    pipe(These.toOk(5), These.map((n: number) => n * 2)),
    { kind: "Ok", value: 10 },
  );
});

Deno.test("These.map transforms value inside Both", () => {
  assertEquals(
    pipe(These.toBoth("warn", 5), These.map((n: number) => n * 2)),
    { kind: "Both", error: "warn", value: 10 },
  );
});

Deno.test("These.map passes through Err unchanged", () => {
  assertEquals(
    pipe(These.toErr<string>("err"), These.map((n: number) => n * 2)),
    { kind: "Error", error: "err" },
  );
});

// ---------------------------------------------------------------------------
// mapErr
// ---------------------------------------------------------------------------

Deno.test("These.mapErr transforms Err value", () => {
  assertEquals(
    pipe(These.toErr("err"), These.mapErr((e: string) => e.toUpperCase())),
    { kind: "Error", error: "ERR" },
  );
});

Deno.test("These.mapErr transforms error inside Both", () => {
  assertEquals(
    pipe(These.toBoth("warn", 5), These.mapErr((e: string) => e.toUpperCase())),
    { kind: "Both", error: "WARN", value: 5 },
  );
});

Deno.test("These.mapErr passes through Ok unchanged", () => {
  assertEquals(
    pipe(These.toOk<number>(5), These.mapErr((e: string) => e.toUpperCase())),
    { kind: "Ok", value: 5 },
  );
});

// ---------------------------------------------------------------------------
// bimap
// ---------------------------------------------------------------------------

Deno.test("These.bimap maps the error side for Err", () => {
  assertEquals(
    pipe(
      These.toErr("err"),
      These.bimap((e: string) => e.toUpperCase(), (n: number) => n * 2),
    ),
    { kind: "Error", error: "ERR" },
  );
});

Deno.test("These.bimap maps the value side for Ok", () => {
  assertEquals(
    pipe(
      These.toOk(5),
      These.bimap((e: string) => e.toUpperCase(), (n: number) => n * 2),
    ),
    { kind: "Ok", value: 10 },
  );
});

Deno.test("These.bimap maps both sides for Both", () => {
  assertEquals(
    pipe(
      These.toBoth("warn", 5),
      These.bimap((e: string) => e.toUpperCase(), (n: number) => n * 2),
    ),
    { kind: "Both", error: "WARN", value: 10 },
  );
});

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

Deno.test("These.chain applies function to Ok value", () => {
  assertEquals(
    pipe(These.toOk(5), These.chain((n: number) => These.toOk(n * 2))),
    { kind: "Ok", value: 10 },
  );
});

Deno.test("These.chain propagates Err without calling function", () => {
  let called = false;
  pipe(
    These.toErr<string>("err"),
    These.chain((_n: number) => {
      called = true;
      return These.toOk(_n);
    }),
  );
  assertStrictEquals(called, false);
});

Deno.test("These.chain on Both applies function and preserves warning when result is Ok", () => {
  assertEquals(
    pipe(These.toBoth("warn", 5), These.chain((n: number) => These.toOk(n * 2))),
    { kind: "Both", error: "warn", value: 10 },
  );
});

Deno.test("These.chain on Both passes through non-Ok result as-is", () => {
  assertEquals(
    pipe(These.toBoth("warn", 5), These.chain((_n: number) => These.toErr<string>("new err"))),
    { kind: "Error", error: "new err" },
  );
});

Deno.test("These.chain can change the value type", () => {
  assertEquals(
    pipe(These.toOk(42), These.chain((n: number) => These.toOk(`num: ${n}`))),
    { kind: "Ok", value: "num: 42" },
  );
});

// ---------------------------------------------------------------------------
// fold
// ---------------------------------------------------------------------------

Deno.test("These.fold calls onErr for Err", () => {
  assertStrictEquals(
    pipe(
      These.toErr("e"),
      These.fold(
        (e: string) => `err:${e}`,
        (a: number) => `ok:${a}`,
        (e: string, a: number) => `both:${e}/${a}`,
      ),
    ),
    "err:e",
  );
});

Deno.test("These.fold calls onOk for Ok", () => {
  assertStrictEquals(
    pipe(
      These.toOk(5),
      These.fold(
        (e: string) => `err:${e}`,
        (a: number) => `ok:${a}`,
        (e: string, a: number) => `both:${e}/${a}`,
      ),
    ),
    "ok:5",
  );
});

Deno.test("These.fold calls onBoth for Both", () => {
  assertStrictEquals(
    pipe(
      These.toBoth("w", 5),
      These.fold(
        (e: string) => `err:${e}`,
        (a: number) => `ok:${a}`,
        (e: string, a: number) => `both:${e}/${a}`,
      ),
    ),
    "both:w/5",
  );
});

// ---------------------------------------------------------------------------
// match
// ---------------------------------------------------------------------------

Deno.test("These.match calls err handler for Err", () => {
  assertStrictEquals(
    pipe(
      These.toErr("e"),
      These.match({
        err: (e: string) => `err:${e}`,
        ok: (a: number) => `ok:${a}`,
        both: (e: string, a: number) => `both:${e}/${a}`,
      }),
    ),
    "err:e",
  );
});

Deno.test("These.match calls ok handler for Ok", () => {
  assertStrictEquals(
    pipe(
      These.toOk(5),
      These.match({
        err: (e: string) => `err:${e}`,
        ok: (a: number) => `ok:${a}`,
        both: (e: string, a: number) => `both:${e}/${a}`,
      }),
    ),
    "ok:5",
  );
});

Deno.test("These.match calls both handler for Both", () => {
  assertStrictEquals(
    pipe(
      These.toBoth("w", 5),
      These.match({
        err: (e: string) => `err:${e}`,
        ok: (a: number) => `ok:${a}`,
        both: (e: string, a: number) => `both:${e}/${a}`,
      }),
    ),
    "both:w/5",
  );
});

// ---------------------------------------------------------------------------
// getOrElse
// ---------------------------------------------------------------------------

Deno.test("These.getOrElse returns value for Ok", () => {
  assertStrictEquals(pipe(These.toOk(5), These.getOrElse(0)), 5);
});

Deno.test("These.getOrElse returns value for Both", () => {
  assertStrictEquals(pipe(These.toBoth("w", 5), These.getOrElse(0)), 5);
});

Deno.test("These.getOrElse returns default for Err", () => {
  assertStrictEquals(pipe(These.toErr<string>("err"), These.getOrElse(0)), 0);
});

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

Deno.test("These.tap executes side effect on Ok and returns original", () => {
  let seen = 0;
  const result = pipe(
    These.toOk(5),
    These.tap((n: number) => {
      seen = n;
    }),
  );
  assertStrictEquals(seen, 5);
  assertEquals(result, { kind: "Ok", value: 5 });
});

Deno.test("These.tap executes side effect on Both and returns original", () => {
  let seen = 0;
  const result = pipe(
    These.toBoth("w", 7),
    These.tap((n: number) => {
      seen = n;
    }),
  );
  assertStrictEquals(seen, 7);
  assertEquals(result, { kind: "Both", error: "w", value: 7 });
});

Deno.test("These.tap does not execute side effect on Err", () => {
  let called = false;
  pipe(
    These.toErr<string>("e"),
    These.tap((_n: number) => {
      called = true;
    }),
  );
  assertStrictEquals(called, false);
});

// ---------------------------------------------------------------------------
// swap
// ---------------------------------------------------------------------------

Deno.test("These.swap converts Err to Ok", () => {
  assertEquals(These.swap(These.toErr("e")), { kind: "Ok", value: "e" });
});

Deno.test("These.swap converts Ok to Err", () => {
  assertEquals(These.swap(These.toOk(5)), { kind: "Error", error: 5 });
});

Deno.test("These.swap swaps Both sides", () => {
  assertEquals(These.swap(These.toBoth("w", 5)), { kind: "Both", error: 5, value: "w" });
});

// ---------------------------------------------------------------------------
// toOption
// ---------------------------------------------------------------------------

Deno.test("These.toOption returns Some for Ok", () => {
  assertEquals(These.toOption(These.toOk(42)), { kind: "Some", value: 42 });
});

Deno.test("These.toOption returns Some for Both", () => {
  assertEquals(These.toOption(These.toBoth("w", 42)), { kind: "Some", value: 42 });
});

Deno.test("These.toOption returns None for Err", () => {
  assertEquals(These.toOption(These.toErr("e")), { kind: "None" });
});

// ---------------------------------------------------------------------------
// toResult
// ---------------------------------------------------------------------------

Deno.test("These.toResult returns Ok for Ok", () => {
  assertEquals(These.toResult(These.toOk(42)), { kind: "Ok", value: 42 });
});

Deno.test("These.toResult returns Ok for Both (discards warning)", () => {
  assertEquals(These.toResult(These.toBoth("w", 42)), { kind: "Ok", value: 42 });
});

Deno.test("These.toResult returns Err for Err", () => {
  assertEquals(These.toResult(These.toErr("e")), { kind: "Error", error: "e" });
});

// ---------------------------------------------------------------------------
// pipe composition
// ---------------------------------------------------------------------------

Deno.test("These composes well in a pipe chain", () => {
  const result = pipe(
    These.toOk(5),
    These.map((n: number) => n * 2),
    These.chain((n: number) => n > 5 ? These.toOk(n) : These.toErr<string>("Too small")),
    These.getOrElse(0),
  );
  assertStrictEquals(result, 10);
});

Deno.test("These pipe preserves warning through chain on Both", () => {
  const result = pipe(
    These.toBoth("original warning", 5),
    These.map((n: number) => n + 1),
    These.chain((n: number) => These.toOk(n * 2)),
  );
  assertEquals(result, { kind: "Both", error: "original warning", value: 12 });
});
