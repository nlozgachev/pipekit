import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Both, These } from "../These.ts";
import { pipe } from "../../Composition/pipe.ts";

// ---------------------------------------------------------------------------
// err / ok / both
// ---------------------------------------------------------------------------

Deno.test("These.err creates a These with only an error", () => {
  assertEquals(These.err("oops"), { kind: "Error", error: "oops" });
});

Deno.test("These.ok creates a These with only a value", () => {
  assertEquals(These.ok(42), { kind: "Ok", value: 42 });
});

Deno.test("These.both creates a These with both error and value", () => {
  const result: Both<string, number> = These.both("warn", 42);
  assertEquals(result, { kind: "Both", error: "warn", value: 42 });
});

// ---------------------------------------------------------------------------
// isErr / isOk / isBoth
// ---------------------------------------------------------------------------

Deno.test("These.isErr returns true for err", () => {
  assertStrictEquals(These.isErr(These.err("e")), true);
});

Deno.test("These.isErr returns false for ok", () => {
  assertStrictEquals(These.isErr(These.ok(1)), false);
});

Deno.test("These.isErr returns false for both", () => {
  assertStrictEquals(These.isErr(These.both("w", 1)), false);
});

Deno.test("These.isOk returns true for ok", () => {
  assertStrictEquals(These.isOk(These.ok(1)), true);
});

Deno.test("These.isOk returns false for err", () => {
  assertStrictEquals(These.isOk(These.err("e")), false);
});

Deno.test("These.isOk returns false for both", () => {
  assertStrictEquals(These.isOk(These.both("w", 1)), false);
});

Deno.test("These.isBoth returns true for both", () => {
  assertStrictEquals(These.isBoth(These.both("w", 1)), true);
});

Deno.test("These.isBoth returns false for err", () => {
  assertStrictEquals(These.isBoth(These.err("e")), false);
});

Deno.test("These.isBoth returns false for ok", () => {
  assertStrictEquals(These.isBoth(These.ok(1)), false);
});

// ---------------------------------------------------------------------------
// hasValue / hasError
// ---------------------------------------------------------------------------

Deno.test("These.hasValue returns false for Err", () => {
  assertStrictEquals(These.hasValue(These.err("e")), false);
});

Deno.test("These.hasValue returns true for Ok", () => {
  assertStrictEquals(These.hasValue(These.ok(1)), true);
});

Deno.test("These.hasValue returns true for Both", () => {
  assertStrictEquals(These.hasValue(These.both("w", 1)), true);
});

Deno.test("These.hasError returns true for Err", () => {
  assertStrictEquals(These.hasError(These.err("e")), true);
});

Deno.test("These.hasError returns false for Ok", () => {
  assertStrictEquals(These.hasError(These.ok(1)), false);
});

Deno.test("These.hasError returns true for Both", () => {
  assertStrictEquals(These.hasError(These.both("w", 1)), true);
});

// ---------------------------------------------------------------------------
// map
// ---------------------------------------------------------------------------

Deno.test("These.map transforms Ok value", () => {
  assertEquals(
    pipe(
      These.ok(5),
      These.map((n: number) => n * 2),
    ),
    { kind: "Ok", value: 10 },
  );
});

Deno.test("These.map transforms value inside Both", () => {
  assertEquals(
    pipe(
      These.both("warn", 5),
      These.map((n: number) => n * 2),
    ),
    { kind: "Both", error: "warn", value: 10 },
  );
});

Deno.test("These.map passes through Err unchanged", () => {
  assertEquals(
    pipe(
      These.err<string>("err"),
      These.map((n: number) => n * 2),
    ),
    { kind: "Error", error: "err" },
  );
});

// ---------------------------------------------------------------------------
// mapErr
// ---------------------------------------------------------------------------

Deno.test("These.mapErr transforms Err value", () => {
  assertEquals(
    pipe(
      These.err("err"),
      These.mapErr((e: string) => e.toUpperCase()),
    ),
    { kind: "Error", error: "ERR" },
  );
});

Deno.test("These.mapErr transforms error inside Both", () => {
  assertEquals(
    pipe(
      These.both("warn", 5),
      These.mapErr((e: string) => e.toUpperCase()),
    ),
    { kind: "Both", error: "WARN", value: 5 },
  );
});

Deno.test("These.mapErr passes through Ok unchanged", () => {
  assertEquals(
    pipe(
      These.ok<number>(5),
      These.mapErr((e: string) => e.toUpperCase()),
    ),
    { kind: "Ok", value: 5 },
  );
});

// ---------------------------------------------------------------------------
// bimap
// ---------------------------------------------------------------------------

Deno.test("These.bimap maps the error side for Err", () => {
  assertEquals(
    pipe(
      These.err("err"),
      These.bimap(
        (e: string) => e.toUpperCase(),
        (n: number) => n * 2,
      ),
    ),
    { kind: "Error", error: "ERR" },
  );
});

Deno.test("These.bimap maps the value side for Ok", () => {
  assertEquals(
    pipe(
      These.ok(5),
      These.bimap(
        (e: string) => e.toUpperCase(),
        (n: number) => n * 2,
      ),
    ),
    { kind: "Ok", value: 10 },
  );
});

Deno.test("These.bimap maps both sides for Both", () => {
  assertEquals(
    pipe(
      These.both("warn", 5),
      These.bimap(
        (e: string) => e.toUpperCase(),
        (n: number) => n * 2,
      ),
    ),
    { kind: "Both", error: "WARN", value: 10 },
  );
});

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

Deno.test("These.chain applies function to Ok value", () => {
  assertEquals(
    pipe(
      These.ok(5),
      These.chain((n: number) => These.ok(n * 2)),
    ),
    { kind: "Ok", value: 10 },
  );
});

Deno.test("These.chain propagates Err without calling function", () => {
  let called = false;
  pipe(
    These.err<string>("err"),
    These.chain((_n: number) => {
      called = true;
      return These.ok(_n);
    }),
  );
  assertStrictEquals(called, false);
});

Deno.test(
  "These.chain on Both applies function and preserves warning when result is Ok",
  () => {
    assertEquals(
      pipe(
        These.both("warn", 5),
        These.chain((n: number) => These.ok(n * 2)),
      ),
      { kind: "Both", error: "warn", value: 10 },
    );
  },
);

Deno.test("These.chain on Both passes through non-Ok result as-is", () => {
  assertEquals(
    pipe(
      These.both("warn", 5),
      These.chain((_n: number) => These.err<string>("new err")),
    ),
    { kind: "Error", error: "new err" },
  );
});

Deno.test("These.chain can change the value type", () => {
  assertEquals(
    pipe(
      These.ok(42),
      These.chain((n: number) => These.ok(`num: ${n}`)),
    ),
    { kind: "Ok", value: "num: 42" },
  );
});

// ---------------------------------------------------------------------------
// fold
// ---------------------------------------------------------------------------

Deno.test("These.fold calls onErr for Err", () => {
  assertStrictEquals(
    pipe(
      These.err("e"),
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
      These.ok(5),
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
      These.both("w", 5),
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
      These.err("e"),
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
      These.ok(5),
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
      These.both("w", 5),
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
  assertStrictEquals(pipe(These.ok(5), These.getOrElse(0)), 5);
});

Deno.test("These.getOrElse returns value for Both", () => {
  assertStrictEquals(pipe(These.both("w", 5), These.getOrElse(0)), 5);
});

Deno.test("These.getOrElse returns default for Err", () => {
  assertStrictEquals(pipe(These.err<string>("err"), These.getOrElse(0)), 0);
});

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

Deno.test("These.tap executes side effect on Ok and returns original", () => {
  let seen = 0;
  const result = pipe(
    These.ok(5),
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
    These.both("w", 7),
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
    These.err<string>("e"),
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
  assertEquals(These.swap(These.err("e")), { kind: "Ok", value: "e" });
});

Deno.test("These.swap converts Ok to Err", () => {
  assertEquals(These.swap(These.ok(5)), { kind: "Error", error: 5 });
});

Deno.test("These.swap swaps Both sides", () => {
  assertEquals(These.swap(These.both("w", 5)), {
    kind: "Both",
    error: 5,
    value: "w",
  });
});

// ---------------------------------------------------------------------------
// toOption
// ---------------------------------------------------------------------------

Deno.test("These.toOption returns Some for Ok", () => {
  assertEquals(These.toOption(These.ok(42)), { kind: "Some", value: 42 });
});

Deno.test("These.toOption returns Some for Both", () => {
  assertEquals(These.toOption(These.both("w", 42)), {
    kind: "Some",
    value: 42,
  });
});

Deno.test("These.toOption returns None for Err", () => {
  assertEquals(These.toOption(These.err("e")), { kind: "None" });
});

// ---------------------------------------------------------------------------
// toResult
// ---------------------------------------------------------------------------

Deno.test("These.toResult returns Ok for Ok", () => {
  assertEquals(These.toResult(These.ok(42)), { kind: "Ok", value: 42 });
});

Deno.test("These.toResult returns Ok for Both (discards warning)", () => {
  assertEquals(These.toResult(These.both("w", 42)), { kind: "Ok", value: 42 });
});

Deno.test("These.toResult returns Err for Err", () => {
  assertEquals(These.toResult(These.err("e")), { kind: "Error", error: "e" });
});

// ---------------------------------------------------------------------------
// pipe composition
// ---------------------------------------------------------------------------

Deno.test("These composes well in a pipe chain", () => {
  const result = pipe(
    These.ok(5),
    These.map((n: number) => n * 2),
    These.chain((n: number) => n > 5 ? These.ok(n) : These.err<string>("Too small")),
    These.getOrElse(0),
  );
  assertStrictEquals(result, 10);
});

Deno.test("These pipe preserves warning through chain on Both", () => {
  const result = pipe(
    These.both("original warning", 5),
    These.map((n: number) => n + 1),
    These.chain((n: number) => These.ok(n * 2)),
  );
  assertEquals(result, { kind: "Both", error: "original warning", value: 12 });
});
