import { Err, Ok, Result } from "./Result.ts";
import { WithError, WithKind, WithValue } from "./InternalTypes.ts";

/**
 * These<E, A> is an inclusive-OR type: it holds an error value (E), a success
 * value (A), or both simultaneously. It reuses Ok<A> and Err<E> from Result,
 * adding a third Both<E, A> variant for partial success with a warning/error.
 *
 * - Err(e)      — only an error/warning (no success value)
 * - Ok(a)       — only a success value (no error)
 * - Both(e, a)  — a warning together with a success value
 *
 * @example
 * ```ts
 * const parse = (s: string): These<string, number> => {
 *   const n = parseFloat(s.trim());
 *   if (isNaN(n)) return These.err("Not a number");
 *   if (s !== s.trim()) return These.both("Leading/trailing whitespace trimmed", n);
 *   return These.ok(n);
 * };
 * ```
 */
export type These<E, A> = Err<E> | Ok<A> | Both<E, A>;

export type Both<E, A> = WithKind<"Both"> & WithError<E> & WithValue<A>;

export namespace These {
  /**
   * Creates a These holding only a success value (no error).
   *
   * @example
   * ```ts
   * These.ok(42);
   * ```
   */
  export const ok = <A>(value: A): Ok<A> => Result.ok(value);

  /**
   * Creates a These holding only an error/warning (no success value).
   *
   * @example
   * ```ts
   * These.err("Something went wrong");
   * ```
   */
  export const err = <E>(error: E): Err<E> => Result.err(error);

  /**
   * Creates a These holding both an error/warning and a success value.
   *
   * @example
   * ```ts
   * These.both("Deprecated API used", result);
   * ```
   */
  export const both = <E, A>(error: E, value: A): Both<E, A> => ({
    kind: "Both",
    error,
    value,
  });

  /**
   * Type guard — checks if a These holds only an error/warning.
   */
  export const isErr = <E, A>(data: These<E, A>): data is Err<E> => data.kind === "Error";

  /**
   * Type guard — checks if a These holds only a success value.
   */
  export const isOk = <E, A>(data: These<E, A>): data is Ok<A> => data.kind === "Ok";

  /**
   * Type guard — checks if a These holds both an error/warning and a success value.
   */
  export const isBoth = <E, A>(data: These<E, A>): data is Both<E, A> => data.kind === "Both";

  /**
   * Returns true if the These contains a success value (Ok or Both).
   */
  export const hasValue = <E, A>(
    data: These<E, A>,
  ): data is Ok<A> | Both<E, A> => data.kind === "Ok" || data.kind === "Both";

  /**
   * Returns true if the These contains an error/warning (Err or Both).
   */
  export const hasError = <E, A>(
    data: These<E, A>,
  ): data is Err<E> | Both<E, A> => data.kind === "Error" || data.kind === "Both";

  /**
   * Transforms the success value, leaving the error unchanged.
   *
   * @example
   * ```ts
   * pipe(These.ok(5), These.map(n => n * 2));          // Ok(10)
   * pipe(These.both("warn", 5), These.map(n => n * 2)); // Both("warn", 10)
   * pipe(These.err("err"), These.map(n => n * 2));      // Err("err")
   * ```
   */
  export const map = <A, B>(f: (a: A) => B) => <E>(data: These<E, A>): These<E, B> => {
    if (isErr(data)) return data;
    if (isOk(data)) return ok(f(data.value));
    return both(data.error, f(data.value));
  };

  /**
   * Transforms the error/warning value, leaving the success value unchanged.
   *
   * @example
   * ```ts
   * pipe(These.err("err"), These.mapErr(e => e.toUpperCase()));         // Err("ERR")
   * pipe(These.both("warn", 5), These.mapErr(e => e.toUpperCase()));    // Both("WARN", 5)
   * ```
   */
  export const mapErr = <E, F>(f: (e: E) => F) => <A>(data: These<E, A>): These<F, A> => {
    if (isOk(data)) return data;
    if (isErr(data)) return err(f(data.error));
    return both(f(data.error), data.value);
  };

  /**
   * Transforms both the error and success values independently.
   *
   * @example
   * ```ts
   * pipe(
   *   These.both("warn", 5),
   *   These.bimap(e => e.toUpperCase(), n => n * 2)
   * ); // Both("WARN", 10)
   * ```
   */
  export const bimap =
    <E, F, A, B>(onErr: (e: E) => F, onOk: (a: A) => B) => (data: These<E, A>): These<F, B> => {
      if (isErr(data)) return err(onErr(data.error));
      if (isOk(data)) return ok(onOk(data.value));
      return both(onErr(data.error), onOk(data.value));
    };

  /**
   * Chains These computations by passing the success value to f.
   * - Err propagates unchanged.
   * - Ok(a) applies f(a) directly.
   * - Both(e, a): applies f(a); if the result is Ok(b), returns Both(e, b)
   *   to preserve the warning. Otherwise returns f(a) as-is.
   *
   * @example
   * ```ts
   * const double = (n: number): These<string, number> => These.ok(n * 2);
   *
   * pipe(These.ok(5), These.chain(double));           // Ok(10)
   * pipe(These.both("warn", 5), These.chain(double)); // Both("warn", 10)
   * pipe(These.err("err"), These.chain(double));      // Err("err")
   * ```
   */
  export const chain = <E, A, B>(f: (a: A) => These<E, B>) => (data: These<E, A>): These<E, B> => {
    if (isErr(data)) return data;
    if (isOk(data)) return f(data.value);
    const result = f(data.value);
    return isOk(result) ? both(data.error, result.value) : result;
  };

  /**
   * Extracts a value from a These by providing handlers for all three cases.
   *
   * @example
   * ```ts
   * pipe(
   *   these,
   *   These.fold(
   *     e => `Error: ${e}`,
   *     a => `Value: ${a}`,
   *     (e, a) => `Both: ${e} / ${a}`
   *   )
   * );
   * ```
   */
  export const fold = <E, A, B>(
    onErr: (e: E) => B,
    onOk: (a: A) => B,
    onBoth: (e: E, a: A) => B,
  ) =>
  (data: These<E, A>): B => {
    if (isErr(data)) return onErr(data.error);
    if (isOk(data)) return onOk(data.value);
    return onBoth(data.error, data.value);
  };

  /**
   * Pattern matches on a These, returning the result of the matching case.
   *
   * @example
   * ```ts
   * pipe(
   *   these,
   *   These.match({
   *     err: e => `Error: ${e}`,
   *     ok: a => `Value: ${a}`,
   *     both: (e, a) => `Both: ${e} / ${a}`
   *   })
   * );
   * ```
   */
  export const match = <E, A, B>(cases: {
    err: (e: E) => B;
    ok: (a: A) => B;
    both: (e: E, a: A) => B;
  }) =>
  (data: These<E, A>): B => {
    if (isErr(data)) return cases.err(data.error);
    if (isOk(data)) return cases.ok(data.value);
    return cases.both(data.error, data.value);
  };

  /**
   * Returns the success value, or a default if the These has no success value.
   *
   * @example
   * ```ts
   * pipe(These.ok(5), These.getOrElse(0));           // 5
   * pipe(These.both("warn", 5), These.getOrElse(0)); // 5
   * pipe(These.err("err"), These.getOrElse(0));      // 0
   * ```
   */
  export const getOrElse = <A>(defaultValue: A) => <E>(data: These<E, A>): A =>
    hasValue(data) ? data.value : defaultValue;

  /**
   * Executes a side effect on the success value without changing the These.
   * Useful for logging or debugging.
   */
  export const tap = <A>(f: (a: A) => void) => <E>(data: These<E, A>): These<E, A> => {
    if (hasValue(data)) f(data.value);
    return data;
  };

  /**
   * Swaps the roles of error and success values.
   * - Err(e)      → Ok(e)
   * - Ok(a)       → Err(a)
   * - Both(e, a)  → Both(a, e)
   *
   * @example
   * ```ts
   * These.swap(These.err("err"));        // Ok("err")
   * These.swap(These.ok(5));             // Err(5)
   * These.swap(These.both("warn", 5));   // Both(5, "warn")
   * ```
   */
  export const swap = <E, A>(data: These<E, A>): These<A, E> => {
    if (isErr(data)) return ok(data.error);
    if (isOk(data)) return err(data.value);
    return both(data.value, data.error);
  };

  /**
   * Converts a These to an Option.
   * Ok and Both produce Some; Err produces None.
   *
   * @example
   * ```ts
   * These.toOption(These.ok(42));          // Some(42)
   * These.toOption(These.both("warn", 42)); // Some(42)
   * These.toOption(These.err("err"));       // None
   * ```
   */
  export const toOption = <E, A>(
    data: These<E, A>,
  ): import("./Option.ts").Option<A> =>
    hasValue(data) ? { kind: "Some", value: data.value } : { kind: "None" };

  /**
   * Converts a These to a Result, discarding any warning from Both.
   * Ok and Both produce Ok; Err produces Err.
   *
   * @example
   * ```ts
   * These.toResult(These.ok(42));           // Ok(42)
   * These.toResult(These.both("warn", 42)); // Ok(42)
   * These.toResult(These.err("err"));       // Err("err")
   * ```
   */
  export const toResult = <E, A>(data: These<E, A>): Result<E, A> => {
    if (hasValue(data)) return Result.ok(data.value);
    return data as Err<E>;
  };
}
