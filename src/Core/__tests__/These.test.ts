import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { These, TheseBoth } from "../These.ts";
import { pipe } from "../../Composition/pipe.ts";

// ---------------------------------------------------------------------------
// first / second / both
// ---------------------------------------------------------------------------

Deno.test("These.first creates a These with only a first value", () => {
  assertEquals(These.first(42), { kind: "First", first: 42 });
});

Deno.test("These.second creates a These with only a second value", () => {
  assertEquals(These.second("oops"), { kind: "Second", second: "oops" });
});

Deno.test("These.both creates a These with both values", () => {
  const result: TheseBoth<number, string> = These.both(42, "warn");
  assertEquals(result, { kind: "Both", first: 42, second: "warn" });
});

// ---------------------------------------------------------------------------
// isFirst / isSecond / isBoth
// ---------------------------------------------------------------------------

Deno.test("These.isFirst returns true for First", () => {
  assertStrictEquals(These.isFirst(These.first(1)), true);
});

Deno.test("These.isFirst returns false for Second", () => {
  assertStrictEquals(These.isFirst(These.second("e")), false);
});

Deno.test("These.isFirst returns false for Both", () => {
  assertStrictEquals(These.isFirst(These.both(1, "w")), false);
});

Deno.test("These.isSecond returns true for Second", () => {
  assertStrictEquals(These.isSecond(These.second("e")), true);
});

Deno.test("These.isSecond returns false for First", () => {
  assertStrictEquals(These.isSecond(These.first(1)), false);
});

Deno.test("These.isSecond returns false for Both", () => {
  assertStrictEquals(These.isSecond(These.both(1, "w")), false);
});

Deno.test("These.isBoth returns true for Both", () => {
  assertStrictEquals(These.isBoth(These.both(1, "w")), true);
});

Deno.test("These.isBoth returns false for First", () => {
  assertStrictEquals(These.isBoth(These.first(1)), false);
});

Deno.test("These.isBoth returns false for Second", () => {
  assertStrictEquals(These.isBoth(These.second("e")), false);
});

// ---------------------------------------------------------------------------
// hasFirst / hasSecond
// ---------------------------------------------------------------------------

Deno.test("These.hasFirst returns true for First", () => {
  assertStrictEquals(These.hasFirst(These.first(1)), true);
});

Deno.test("These.hasFirst returns true for Both", () => {
  assertStrictEquals(These.hasFirst(These.both(1, "w")), true);
});

Deno.test("These.hasFirst returns false for Second", () => {
  assertStrictEquals(These.hasFirst(These.second("e")), false);
});

Deno.test("These.hasSecond returns true for Second", () => {
  assertStrictEquals(These.hasSecond(These.second("e")), true);
});

Deno.test("These.hasSecond returns true for Both", () => {
  assertStrictEquals(These.hasSecond(These.both(1, "w")), true);
});

Deno.test("These.hasSecond returns false for First", () => {
  assertStrictEquals(These.hasSecond(These.first(1)), false);
});

// ---------------------------------------------------------------------------
// mapFirst
// ---------------------------------------------------------------------------

Deno.test("These.mapFirst transforms First value", () => {
  assertEquals(
    pipe(These.first(5), These.mapFirst((n: number) => n * 2)),
    { kind: "First", first: 10 },
  );
});

Deno.test("These.mapFirst transforms first value inside Both", () => {
  assertEquals(
    pipe(These.both(5, "warn"), These.mapFirst((n: number) => n * 2)),
    { kind: "Both", first: 10, second: "warn" },
  );
});

Deno.test("These.mapFirst passes through Second unchanged", () => {
  assertEquals(
    pipe(These.second<string>("err"), These.mapFirst((n: number) => n * 2)),
    { kind: "Second", second: "err" },
  );
});

// ---------------------------------------------------------------------------
// mapSecond
// ---------------------------------------------------------------------------

Deno.test("These.mapSecond transforms Second value", () => {
  assertEquals(
    pipe(These.second("warn"), These.mapSecond((e: string) => e.toUpperCase())),
    { kind: "Second", second: "WARN" },
  );
});

Deno.test("These.mapSecond transforms second value inside Both", () => {
  assertEquals(
    pipe(These.both(5, "warn"), These.mapSecond((e: string) => e.toUpperCase())),
    { kind: "Both", first: 5, second: "WARN" },
  );
});

Deno.test("These.mapSecond passes through First unchanged", () => {
  assertEquals(
    pipe(These.first<number>(5), These.mapSecond((e: string) => e.toUpperCase())),
    { kind: "First", first: 5 },
  );
});

// ---------------------------------------------------------------------------
// bimap
// ---------------------------------------------------------------------------

Deno.test("These.bimap maps the first side for First", () => {
  assertEquals(
    pipe(
      These.first(5),
      These.bimap(
        (n: number) => n * 2,
        (e: string) => e.toUpperCase(),
      ),
    ),
    { kind: "First", first: 10 },
  );
});

Deno.test("These.bimap maps the second side for Second", () => {
  assertEquals(
    pipe(
      These.second("warn"),
      These.bimap(
        (n: number) => n * 2,
        (e: string) => e.toUpperCase(),
      ),
    ),
    { kind: "Second", second: "WARN" },
  );
});

Deno.test("These.bimap maps both sides for Both", () => {
  assertEquals(
    pipe(
      These.both(5, "warn"),
      These.bimap(
        (n: number) => n * 2,
        (e: string) => e.toUpperCase(),
      ),
    ),
    { kind: "Both", first: 10, second: "WARN" },
  );
});

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

Deno.test("These.chain applies function to First value", () => {
  assertEquals(
    pipe(
      These.first(5),
      These.chain((n: number) => These.first(n * 2)),
    ),
    { kind: "First", first: 10 },
  );
});

Deno.test("These.chain propagates Second without calling function", () => {
  let called = false;
  pipe(
    These.second<string>("warn"),
    These.chain((_n: number) => {
      called = true;
      return These.first(_n);
    }),
  );
  assertStrictEquals(called, false);
});

Deno.test(
  "These.chain on Both applies function and preserves second when result is First",
  () => {
    assertEquals(
      pipe(
        These.both(5, "warn"),
        These.chain((n: number) => These.first(n * 2)),
      ),
      { kind: "Both", first: 10, second: "warn" },
    );
  },
);

Deno.test("These.chain on Both passes through non-First result as-is", () => {
  assertEquals(
    pipe(
      These.both(5, "warn"),
      These.chain((_n: number) => These.second<string>("new warn")),
    ),
    { kind: "Second", second: "new warn" },
  );
});

Deno.test("These.chain can change the first value type", () => {
  assertEquals(
    pipe(
      These.first(42),
      These.chain((n: number) => These.first(`num: ${n}`)),
    ),
    { kind: "First", first: "num: 42" },
  );
});

// ---------------------------------------------------------------------------
// fold
// ---------------------------------------------------------------------------

Deno.test("These.fold calls onFirst for First", () => {
  assertStrictEquals(
    pipe(
      These.first(5),
      These.fold(
        (a: number) => `first:${a}`,
        (b: string) => `second:${b}`,
        (a: number, b: string) => `both:${a}/${b}`,
      ),
    ),
    "first:5",
  );
});

Deno.test("These.fold calls onSecond for Second", () => {
  assertStrictEquals(
    pipe(
      These.second("e"),
      These.fold(
        (a: number) => `first:${a}`,
        (b: string) => `second:${b}`,
        (a: number, b: string) => `both:${a}/${b}`,
      ),
    ),
    "second:e",
  );
});

Deno.test("These.fold calls onBoth for Both", () => {
  assertStrictEquals(
    pipe(
      These.both(5, "w"),
      These.fold(
        (a: number) => `first:${a}`,
        (b: string) => `second:${b}`,
        (a: number, b: string) => `both:${a}/${b}`,
      ),
    ),
    "both:5/w",
  );
});

// ---------------------------------------------------------------------------
// match
// ---------------------------------------------------------------------------

Deno.test("These.match calls first handler for First", () => {
  assertStrictEquals(
    pipe(
      These.first(5),
      These.match({
        first: (a: number) => `first:${a}`,
        second: (b: string) => `second:${b}`,
        both: (a: number, b: string) => `both:${a}/${b}`,
      }),
    ),
    "first:5",
  );
});

Deno.test("These.match calls second handler for Second", () => {
  assertStrictEquals(
    pipe(
      These.second("e"),
      These.match({
        first: (a: number) => `first:${a}`,
        second: (b: string) => `second:${b}`,
        both: (a: number, b: string) => `both:${a}/${b}`,
      }),
    ),
    "second:e",
  );
});

Deno.test("These.match calls both handler for Both", () => {
  assertStrictEquals(
    pipe(
      These.both(5, "w"),
      These.match({
        first: (a: number) => `first:${a}`,
        second: (b: string) => `second:${b}`,
        both: (a: number, b: string) => `both:${a}/${b}`,
      }),
    ),
    "both:5/w",
  );
});

// ---------------------------------------------------------------------------
// getOrElse
// ---------------------------------------------------------------------------

Deno.test("These.getOrElse returns first value for First", () => {
  assertStrictEquals(pipe(These.first(5), These.getOrElse(0)), 5);
});

Deno.test("These.getOrElse returns first value for Both", () => {
  assertStrictEquals(pipe(These.both(5, "w"), These.getOrElse(0)), 5);
});

Deno.test("These.getOrElse returns default for Second", () => {
  assertStrictEquals(pipe(These.second<string>("warn"), These.getOrElse(0)), 0);
});

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

Deno.test("These.tap executes side effect on First and returns original", () => {
  let seen = 0;
  const result = pipe(
    These.first(5),
    These.tap((n: number) => {
      seen = n;
    }),
  );
  assertStrictEquals(seen, 5);
  assertEquals(result, { kind: "First", first: 5 });
});

Deno.test("These.tap executes side effect on Both and returns original", () => {
  let seen = 0;
  const result = pipe(
    These.both(7, "w"),
    These.tap((n: number) => {
      seen = n;
    }),
  );
  assertStrictEquals(seen, 7);
  assertEquals(result, { kind: "Both", first: 7, second: "w" });
});

Deno.test("These.tap does not execute side effect on Second", () => {
  let called = false;
  pipe(
    These.second<string>("e"),
    These.tap((_n: number) => {
      called = true;
    }),
  );
  assertStrictEquals(called, false);
});

// ---------------------------------------------------------------------------
// swap
// ---------------------------------------------------------------------------

Deno.test("These.swap converts First to Second", () => {
  assertEquals(These.swap(These.first(5)), { kind: "Second", second: 5 });
});

Deno.test("These.swap converts Second to First", () => {
  assertEquals(These.swap(These.second("e")), { kind: "First", first: "e" });
});

Deno.test("These.swap swaps Both sides", () => {
  assertEquals(These.swap(These.both(5, "w")), {
    kind: "Both",
    first: "w",
    second: 5,
  });
});

// ---------------------------------------------------------------------------
// toOption
// ---------------------------------------------------------------------------

Deno.test("These.toOption returns Some for First", () => {
  assertEquals(These.toOption(These.first(42)), { kind: "Some", value: 42 });
});

Deno.test("These.toOption returns Some for Both", () => {
  assertEquals(These.toOption(These.both(42, "w")), { kind: "Some", value: 42 });
});

Deno.test("These.toOption returns None for Second", () => {
  assertEquals(These.toOption(These.second("e")), { kind: "None" });
});

// ---------------------------------------------------------------------------
// pipe composition
// ---------------------------------------------------------------------------

Deno.test("These composes well in a pipe chain", () => {
  const result = pipe(
    These.first(5),
    These.mapFirst((n: number) => n * 2),
    These.chain((n: number) => n > 5 ? These.first(n) : These.second<string>("Too small")),
    These.getOrElse(0),
  );
  assertStrictEquals(result, 10);
});

Deno.test("These pipe preserves second through chain on Both", () => {
  const result = pipe(
    These.both(5, "original warning"),
    These.mapFirst((n: number) => n + 1),
    These.chain((n: number) => These.first(n * 2)),
  );
  assertEquals(result, { kind: "Both", first: 12, second: "original warning" });
});
