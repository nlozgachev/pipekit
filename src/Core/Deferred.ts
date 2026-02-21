/**
 * A one-shot async value that supports `await` but nothing else.
 *
 * Unlike `Promise`, `Deferred` has no `.catch()` or `.finally()`, and its
 * `.then()` returns `void` — so it cannot be chained. This makes it the
 * natural return type for `Task`, which is guaranteed to never reject.
 *
 * @example
 * ```ts
 * const value = await Deferred.fromPromise(Promise.resolve(42));
 * // value === 42
 * ```
 */
export type Deferred<A> = {
  readonly then: (onfulfilled: (value: A) => void) => void;
};

export namespace Deferred {
  /**
   * Wraps a `Promise` into a `Deferred`, hiding `.catch()`, `.finally()`,
   * and chainable `.then()`.
   *
   * @example
   * ```ts
   * const d = Deferred.fromPromise(Promise.resolve("hello"));
   * const value = await d; // "hello"
   * ```
   */
  export const fromPromise = <A>(p: Promise<A>): Deferred<A> => ({
    then: (f) => {
      p.then(f);
    },
  });

  /**
   * Converts a `Deferred` back into a `Promise`.
   *
   * @example
   * ```ts
   * const p = Deferred.toPromise(Deferred.fromPromise(Promise.resolve(42)));
   * // p is Promise<42>
   * ```
   */
  export const toPromise = <A>(d: Deferred<A>): Promise<A> =>
    new Promise((resolve) => d.then(resolve));
}
