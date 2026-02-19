import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Brand } from "../Brand.ts";

// ---------------------------------------------------------------------------
// make
// ---------------------------------------------------------------------------

Deno.test("Brand.make constructor returns the value unchanged at runtime", () => {
  const toUserId = Brand.make<"UserId", string>();
  const id = toUserId("user-123");
  assertStrictEquals(id, "user-123");
});

Deno.test("Brand.make works with number type", () => {
  const toPositive = Brand.make<"Positive", number>();
  assertStrictEquals(toPositive(42), 42);
});

Deno.test("Brand.make works with string type alias", () => {
  type ValidEmail = Brand<"ValidEmail", string>;
  const toValidEmail = Brand.make<"ValidEmail", string>();
  const email = toValidEmail("user@example.com");
  assertStrictEquals(email, "user@example.com");
});

Deno.test("Brand.make can produce multiple distinct branded values", () => {
  const toUserId = Brand.make<"UserId", string>();
  const id1 = toUserId("u-1");
  const id2 = toUserId("u-2");
  assertStrictEquals(id1, "u-1");
  assertStrictEquals(id2, "u-2");
});

Deno.test("Brand.make returned constructor is reusable", () => {
  const toScore = Brand.make<"Score", number>();
  const scores = [1, 2, 3].map(toScore);
  assertEquals(scores, [1, 2, 3]);
});

// ---------------------------------------------------------------------------
// unwrap
// ---------------------------------------------------------------------------

Deno.test("Brand.unwrap returns the underlying value", () => {
  const toUserId = Brand.make<"UserId", string>();
  const id = toUserId("user-42");
  const raw = Brand.unwrap(id);
  assertStrictEquals(raw, "user-42");
});

Deno.test("Brand.unwrap round-trips with make", () => {
  const toScore = Brand.make<"Score", number>();
  const score = toScore(100);
  assertStrictEquals(Brand.unwrap(score), 100);
});

// ---------------------------------------------------------------------------
// type-level behaviour (runtime identity)
// ---------------------------------------------------------------------------

Deno.test("branded value is strictly equal to the raw value at runtime", () => {
  const toId = Brand.make<"Id", string>();
  const id = toId("abc");
  assertStrictEquals(id, "abc");
});

Deno.test("two separately branded values with same underlying value are equal", () => {
  const toUserId = Brand.make<"UserId", string>();
  const toProductId = Brand.make<"ProductId", string>();
  const uid = toUserId("shared");
  const pid = toProductId("shared");
  // At runtime brands are erased — both are just the string "shared"
  assertStrictEquals(uid, pid as unknown as typeof uid);
});
