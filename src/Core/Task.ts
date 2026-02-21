import { Result } from "./Result.ts";

/**
 * A lazy async computation that always resolves.
 *
 * Two guarantees:
 * - **Lazy** — nothing starts until you call it.
 * - **Infallible** — it never rejects. If failure is possible, encode it in the
 *   return type using `TaskResult<E, A>` instead.
 *
 * @example
 * ```ts
 * const getTimestamp: Task<number> = () => Promise.resolve(Date.now());
 *
 * // Nothing runs yet — getTimestamp is just a description
 * const formatted = pipe(
 *   getTimestamp,
 *   Task.map(ts => new Date(ts).toISOString())
 * );
 *
 * // Execute when ready
 * const result = await formatted();
 * ```
 */
export type Task<A> = () => Promise<A>;

export namespace Task {
  /**
   * Creates a Task that immediately resolves to the given value.
   *
   * @example
   * ```ts
   * const task = Task.resolve(42);
   * task().then(console.log); // 42
   * ```
   */
  export const resolve = <A>(value: A): Task<A> => () => Promise.resolve(value);

  /**
   * Creates a Task from a function that returns a Promise.
   * Alias for directly creating a Task.
   *
   * @example
   * ```ts
   * const getTimestamp = Task.from(() => Promise.resolve(Date.now()));
   * ```
   */
  export const from = <A>(f: () => Promise<A>): Task<A> => f;

  /**
   * Transforms the value inside a Task.
   *
   * @example
   * ```ts
   * pipe(
   *   Task.resolve(5),
   *   Task.map(n => n * 2)
   * )(); // Promise<10>
   * ```
   */
  export const map = <A, B>(f: (a: A) => B) => (data: Task<A>): Task<B> => () => data().then(f);

  /**
   * Chains Task computations. Passes the resolved value of the first Task to f.
   *
   * @example
   * ```ts
   * const readUserId: Task<string> = () => Promise.resolve(session.userId);
   * const loadPrefs = (id: string): Task<Preferences> => () => Promise.resolve(prefsCache.get(id));
   *
   * pipe(
   *   readUserId,
   *   Task.chain(loadPrefs)
   * )(); // Promise<Preferences>
   * ```
   */
  export const chain = <A, B>(f: (a: A) => Task<B>) => (data: Task<A>): Task<B> => () =>
    data().then((a) => f(a)());

  /**
   * Applies a function wrapped in a Task to a value wrapped in a Task.
   * Both Tasks run in parallel.
   *
   * @example
   * ```ts
   * const add = (a: number) => (b: number) => a + b;
   * pipe(
   *   Task.resolve(add),
   *   Task.ap(Task.resolve(5)),
   *   Task.ap(Task.resolve(3))
   * )(); // Promise<8>
   * ```
   */
  export const ap = <A>(arg: Task<A>) => <B>(data: Task<(a: A) => B>): Task<B> => () =>
    Promise.all([data(), arg()]).then(([f, a]) => f(a));

  /**
   * Executes a side effect on the value without changing the Task.
   * Useful for logging or debugging.
   *
   * @example
   * ```ts
   * pipe(
   *   loadConfig,
   *   Task.tap(cfg => console.log("Config:", cfg)),
   *   Task.map(buildReport)
   * );
   * ```
   */
  export const tap = <A>(f: (a: A) => void) => (data: Task<A>): Task<A> => () =>
    data().then((a) => {
      f(a);
      return a;
    });

  /**
   * Runs multiple Tasks in parallel and collects their results.
   *
   * @example
   * ```ts
   * Task.all([loadConfig, detectLocale, loadTheme])();
   * // Promise<[Config, string, Theme]>
   * ```
   */
  export const all = <T extends readonly Task<unknown>[]>(
    tasks: T,
  ): Task<{ [K in keyof T]: T[K] extends Task<infer A> ? A : never }> =>
  () =>
    Promise.all(tasks.map((t) => t())) as Promise<
      {
        [K in keyof T]: T[K] extends Task<infer A> ? A : never;
      }
    >;

  /**
   * Delays the execution of a Task by the specified milliseconds.
   * Useful for debouncing or rate limiting.
   *
   * @example
   * ```ts
   * pipe(
   *   Task.resolve(42),
   *   Task.delay(1000)
   * )(); // Resolves after 1 second
   * ```
   */
  export const delay = (ms: number) => <A>(data: Task<A>): Task<A> => () =>
    new Promise((resolve, reject) => setTimeout(() => data().then(resolve, reject), ms));

  /**
   * Runs a Task a fixed number of times sequentially, collecting all results into an array.
   * An optional delay (ms) can be inserted between runs.
   *
   * @example
   * ```ts
   * pipe(
   *   pollSensor,
   *   Task.repeat({ times: 5, delay: 1000 })
   * )(); // Task<Reading[]> — 5 readings, one per second
   * ```
   */
  export const repeat =
    (options: { times: number; delay?: number }) => <A>(task: Task<A>): Task<A[]> => () => {
      const { times, delay: ms } = options;
      if (times <= 0) return Promise.resolve([]);
      const results: A[] = [];
      const wait = (): Promise<void> =>
        ms !== undefined && ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
      const run = (left: number): Promise<A[]> =>
        task().then((a) => {
          results.push(a);
          if (left <= 1) return results;
          return wait().then(() => run(left - 1));
        });
      return run(times);
    };

  /**
   * Runs a Task repeatedly until the result satisfies a predicate, returning that result.
   * An optional delay (ms) can be inserted between runs.
   *
   * @example
   * ```ts
   * pipe(
   *   checkStatus,
   *   Task.repeatUntil({ when: (s) => s === "ready", delay: 500 })
   * )(); // polls every 500ms until status is "ready"
   * ```
   */
  export const repeatUntil =
    <A>(options: { when: (a: A) => boolean; delay?: number }) => (task: Task<A>): Task<A> => () => {
      const { when: predicate, delay: ms } = options;
      const wait = (): Promise<void> =>
        ms !== undefined && ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
      const run = (): Promise<A> =>
        task().then((a) => {
          if (predicate(a)) return a;
          return wait().then(run);
        });
      return run();
    };

  /**
   * Converts a `Task<A>` into a `Task<Result<E, A>>`, resolving to `Err` if the
   * Task does not complete within the given time.
   *
   * @example
   * ```ts
   * pipe(
   *   heavyComputation,
   *   Task.timeout(5000, () => "timed out"),
   *   TaskResult.chain(processResult)
   * );
   * ```
   */
  export const timeout =
    <E>(ms: number, onTimeout: () => E) => <A>(task: Task<A>): Task<Result<E, A>> => () => {
      let timerId: ReturnType<typeof setTimeout>;
      return Promise.race([
        task().then((a): Result<E, A> => {
          clearTimeout(timerId);
          return Result.ok(a);
        }),
        new Promise<Result<E, A>>((resolve) => {
          timerId = setTimeout(() => resolve(Result.err(onTimeout())), ms);
        }),
      ]);
    };
}
