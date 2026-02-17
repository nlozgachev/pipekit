/**
 * Task represents a lazy asynchronous computation.
 * Unlike Promise, a Task doesn't execute until you call it.
 * This makes Tasks composable and referentially transparent.
 *
 * @example
 * ```ts
 * const fetchData: Task<Data> = () => fetch('/api/data').then(r => r.json());
 *
 * // Nothing happens yet - the task is just defined
 * const processedData = pipe(
 *   fetchData,
 *   Task.map(data => transform(data))
 * );
 *
 * // Now execute the task
 * processedData().then(result => console.log(result));
 * ```
 */
export type Task<A> = () => Promise<A>;

export namespace Task {
  /**
   * Wraps a value in a Task that immediately resolves to that value.
   *
   * @example
   * ```ts
   * const task = Task.of(42);
   * task().then(console.log); // 42
   * ```
   */
  export const of = <A>(value: A): Task<A> => () => Promise.resolve(value);

  /**
   * Creates a Task that will reject with the given error.
   */
  export const fail = <A>(error: unknown): Task<A> => () => Promise.reject(error);

  /**
   * Creates a Task from a function that returns a Promise.
   * Alias for directly creating a Task.
   *
   * @example
   * ```ts
   * const fetchUser = Task.from(() => fetch('/user').then(r => r.json()));
   * ```
   */
  export const from = <A>(f: () => Promise<A>): Task<A> => f;

  /**
   * Transforms the value inside a Task.
   *
   * @example
   * ```ts
   * pipe(
   *   Task.of(5),
   *   Task.map(n => n * 2)
   * )(); // Promise<10>
   * ```
   */
  export const map = <A, B>(f: (a: A) => B) => (data: Task<A>): Task<B> => () => data().then(f);

  /**
   * Chains Task computations. If the first succeeds, passes the value to f.
   *
   * @example
   * ```ts
   * const fetchUser = (id: string): Task<User> => () => fetch(`/users/${id}`).then(r => r.json());
   * const fetchPosts = (user: User): Task<Post[]> => () => fetch(`/posts?userId=${user.id}`).then(r => r.json());
   *
   * pipe(
   *   fetchUser("123"),
   *   Task.chain(fetchPosts)
   * )(); // Promise<Post[]>
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
   *   Task.of(add),
   *   Task.ap(Task.of(5)),
   *   Task.ap(Task.of(3))
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
   *   fetchData,
   *   Task.tap(data => console.log("Fetched:", data)),
   *   Task.map(transform)
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
   * Task.all([fetchUser, fetchPosts, fetchComments])();
   * // Promise<[User, Post[], Comment[]]>
   * ```
   */
  export const all = <T extends readonly Task<unknown>[]>(
    tasks: T,
  ): Task<{ [K in keyof T]: T[K] extends Task<infer A> ? A : never }> =>
  () =>
    Promise.all(tasks.map((t) => t())) as Promise<
      { [K in keyof T]: T[K] extends Task<infer A> ? A : never }
    >;

  /**
   * Delays the execution of a Task by the specified milliseconds.
   *
   * @example
   * ```ts
   * pipe(
   *   Task.of(42),
   *   Task.delay(1000)
   * )(); // Resolves after 1 second
   * ```
   */
  export const delay = (ms: number) => <A>(data: Task<A>): Task<A> => () =>
    new Promise((resolve, reject) => setTimeout(() => data().then(resolve, reject), ms));
}
