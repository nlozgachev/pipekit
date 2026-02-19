import { NonEmptyList } from "../Types/NonEmptyList.ts";
import { Task } from "./Task.ts";
import { Validation } from "./Validation.ts";

/**
 * A Task that resolves to a Validation — combining async operations with
 * error accumulation. Unlike TaskResult, multiple failures are collected
 * rather than short-circuiting on the first error.
 *
 * @example
 * ```ts
 * const validateName = (name: string): TaskValidation<string, string> =>
 *   name.length > 0
 *     ? TaskValidation.of(name)
 *     : TaskValidation.fail("Name is required");
 *
 * // Accumulate errors from multiple async validations using ap
 * pipe(
 *   TaskValidation.of((name: string) => (age: number) => ({ name, age })),
 *   TaskValidation.ap(validateName("")),
 *   TaskValidation.ap(validateAge(-1))
 * )();
 * // Invalid(["Name is required", "Age must be positive"])
 * ```
 */
export type TaskValidation<E, A> = Task<Validation<E, A>>;

export namespace TaskValidation {
  /**
   * Wraps a value in a valid TaskValidation.
   */
  export const of = <E, A>(value: A): TaskValidation<E, A> => Task.of(Validation.of(value));

  /**
   * Creates a failed TaskValidation with a single error.
   */
  export const fail = <E, A>(error: E): TaskValidation<E, A> => Task.of(Validation.fail(error));

  /**
   * Lifts a Validation into a TaskValidation.
   */
  export const fromValidation = <E, A>(validation: Validation<E, A>): TaskValidation<E, A> =>
    Task.of(validation);

  /**
   * Creates a TaskValidation from a Promise-returning function.
   * Catches any errors and transforms them using the onError function.
   *
   * @example
   * ```ts
   * const fetchUser = (id: string): TaskValidation<string, User> =>
   *   TaskValidation.tryCatch(
   *     () => fetch(`/users/${id}`).then(r => r.json()),
   *     e => `Failed to fetch user: ${e}`
   *   );
   * ```
   */
  export const tryCatch = <E, A>(
    f: () => Promise<A>,
    onError: (e: unknown) => E,
  ): TaskValidation<E, A> =>
  () =>
    f()
      .then(Validation.of<E, A>)
      .catch((e) => Validation.fail(onError(e)));

  /**
   * Transforms the success value inside a TaskValidation.
   */
  export const map =
    <E, A, B>(f: (a: A) => B) => (data: TaskValidation<E, A>): TaskValidation<E, B> =>
      Task.map(Validation.map<A, B>(f))(data);

  /**
   * Chains TaskValidation computations. If the first is Valid, passes the value
   * to f. If the first is Invalid, propagates the errors.
   *
   * Note: chain short-circuits on first error. Use ap to accumulate errors.
   */
  export const chain =
    <E, A, B>(f: (a: A) => TaskValidation<E, B>) =>
    (data: TaskValidation<E, A>): TaskValidation<E, B> =>
      Task.chain((validation: Validation<E, A>) =>
        Validation.isValid(validation)
          ? f(validation.value)
          : Task.of(Validation.toInvalid(validation.errors))
      )(data);

  /**
   * Applies a function wrapped in a TaskValidation to a value wrapped in a
   * TaskValidation. Both Tasks run in parallel and errors from both sides
   * are accumulated.
   *
   * @example
   * ```ts
   * pipe(
   *   TaskValidation.of((name: string) => (age: number) => ({ name, age })),
   *   TaskValidation.ap(validateName(name)),
   *   TaskValidation.ap(validateAge(age))
   * )();
   * ```
   */
  export const ap =
    <E, A>(arg: TaskValidation<E, A>) =>
    <B>(data: TaskValidation<E, (a: A) => B>): TaskValidation<E, B> =>
    () => Promise.all([data(), arg()]).then(([vf, va]) => Validation.ap(va)(vf));

  /**
   * Extracts a value from a TaskValidation by providing handlers for both cases.
   */
  export const fold =
    <E, A, B>(onInvalid: (errors: NonEmptyList<E>) => B, onValid: (a: A) => B) =>
    (data: TaskValidation<E, A>): Task<B> =>
      Task.map(Validation.fold<E, A, B>(onInvalid, onValid))(data);

  /**
   * Pattern matches on a TaskValidation, returning a Task of the result.
   *
   * @example
   * ```ts
   * pipe(
   *   validateForm(input),
   *   TaskValidation.match({
   *     valid: data => save(data),
   *     invalid: errors => showErrors(errors)
   *   })
   * )();
   * ```
   */
  export const match =
    <E, A, B>(cases: { valid: (a: A) => B; invalid: (errors: NonEmptyList<E>) => B }) =>
    (data: TaskValidation<E, A>): Task<B> => Task.map(Validation.match<E, A, B>(cases))(data);

  /**
   * Returns the success value or a default value if the TaskValidation is invalid.
   */
  export const getOrElse = <E, A>(defaultValue: A) => (data: TaskValidation<E, A>): Task<A> =>
    Task.map(Validation.getOrElse<E, A>(defaultValue))(data);

  /**
   * Executes a side effect on the success value without changing the TaskValidation.
   * Useful for logging or debugging.
   */
  export const tap =
    <E, A>(f: (a: A) => void) => (data: TaskValidation<E, A>): TaskValidation<E, A> =>
      Task.map(Validation.tap<E, A>(f))(data);

  /**
   * Recovers from an Invalid state by providing a fallback TaskValidation.
   */
  export const recover =
    <E, A>(fallback: () => TaskValidation<E, A>) =>
    (data: TaskValidation<E, A>): TaskValidation<E, A> =>
      Task.chain((validation: Validation<E, A>) =>
        Validation.isValid(validation) ? Task.of(validation) : fallback()
      )(data);
}
