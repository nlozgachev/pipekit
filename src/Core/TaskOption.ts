import { Option } from "./Option.ts";
import { Task } from "./Task.ts";
import { TaskResult } from "./TaskResult.ts";

/**
 * A Task that resolves to an optional value.
 * Combines async operations with the Option type for values that may not exist.
 *
 * @example
 * ```ts
 * const findUser = (id: string): TaskOption<User> =>
 *   TaskOption.tryCatch(() => db.users.findById(id));
 *
 * pipe(
 *   findUser("123"),
 *   TaskOption.map(user => user.name),
 *   TaskOption.getOrElse("Unknown")
 * )();
 * ```
 */
export type TaskOption<A> = Task<Option<A>>;

export namespace TaskOption {
  /**
   * Wraps a value in a Some inside a Task.
   */
  export const of = <A>(value: A): TaskOption<A> => Task.of(Option.of(value));

  /**
   * Creates a TaskOption that resolves to None.
   */
  export const none = <A = never>(): TaskOption<A> => Task.of(Option.none());

  /**
   * Lifts an Option into a TaskOption.
   */
  export const fromOption = <A>(option: Option<A>): TaskOption<A> => Task.of(option);

  /**
   * Lifts a Task into a TaskOption by wrapping its result in Some.
   */
  export const fromTask = <A>(task: Task<A>): TaskOption<A> => Task.map(Option.of)(task);

  /**
   * Creates a TaskOption from a Promise-returning function.
   * Returns Some if the promise resolves, None if it rejects.
   *
   * @example
   * ```ts
   * const fetchUser = TaskOption.tryCatch(() =>
   *   fetch("/user/1").then(r => r.json())
   * );
   * ```
   */
  export const tryCatch = <A>(f: () => Promise<A>): TaskOption<A> => () =>
    f().then(Option.of).catch(() => Option.none());

  /**
   * Transforms the value inside a TaskOption.
   */
  export const map = <A, B>(f: (a: A) => B) => (data: TaskOption<A>): TaskOption<B> =>
    Task.map(Option.map(f))(data);

  /**
   * Chains TaskOption computations. If the first resolves to Some, passes the
   * value to f. If the first resolves to None, propagates None.
   *
   * @example
   * ```ts
   * pipe(
   *   findUser("123"),
   *   TaskOption.chain(user => findOrg(user.orgId))
   * )();
   * ```
   */
  export const chain = <A, B>(f: (a: A) => TaskOption<B>) => (data: TaskOption<A>): TaskOption<B> =>
    Task.chain((option: Option<A>) =>
      Option.isSome(option) ? f(option.value) : Task.of(Option.none())
    )(data);

  /**
   * Applies a function wrapped in a TaskOption to a value wrapped in a TaskOption.
   * Both Tasks run in parallel.
   */
  export const ap =
    <A>(arg: TaskOption<A>) => <B>(data: TaskOption<(a: A) => B>): TaskOption<B> => () =>
      Promise.all([data(), arg()]).then(([of_, oa]) => Option.ap(oa)(of_));

  /**
   * Extracts a value from a TaskOption by providing handlers for both cases.
   */
  export const fold =
    <A, B>(onNone: () => B, onSome: (a: A) => B) => (data: TaskOption<A>): Task<B> =>
      Task.map(Option.fold(onNone, onSome))(data);

  /**
   * Pattern matches on a TaskOption, returning a Task of the result.
   *
   * @example
   * ```ts
   * pipe(
   *   findUser("123"),
   *   TaskOption.match({
   *     some: user => `Hello, ${user.name}`,
   *     none: () => "User not found"
   *   })
   * )();
   * ```
   */
  export const match =
    <A, B>(cases: { none: () => B; some: (a: A) => B }) => (data: TaskOption<A>): Task<B> =>
      Task.map(Option.match(cases))(data);

  /**
   * Returns the value or a default if the TaskOption resolves to None.
   */
  export const getOrElse = <A>(defaultValue: A) => (data: TaskOption<A>): Task<A> =>
    Task.map(Option.getOrElse(defaultValue))(data);

  /**
   * Executes a side effect on the value without changing the TaskOption.
   * Useful for logging or debugging.
   */
  export const tap = <A>(f: (a: A) => void) => (data: TaskOption<A>): TaskOption<A> =>
    Task.map(Option.tap(f))(data);

  /**
   * Filters the value inside a TaskOption. Returns None if the predicate fails.
   */
  export const filter = <A>(predicate: (a: A) => boolean) => (data: TaskOption<A>): TaskOption<A> =>
    Task.map(Option.filter(predicate))(data);

  /**
   * Converts a TaskOption to a TaskResult, using onNone to produce the error value.
   *
   * @example
   * ```ts
   * pipe(
   *   findUser("123"),
   *   TaskOption.toTaskResult(() => "User not found")
   * );
   * ```
   */
  export const toTaskResult = <E>(onNone: () => E) => <A>(data: TaskOption<A>): TaskResult<E, A> =>
    Task.map(Option.toResult(onNone))(data);
}
