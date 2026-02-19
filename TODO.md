# pipekit — 1.0.0 Roadmap

## Complement Existing Types

- [ ] `TaskOption<A>` -- async operations that may return nothing (`Task<Option<A>>`)
- [ ] `TaskValidation<E, A>` -- async operations that accumulate errors (`Task<Validation<E, A>>`)
- [ ] `These<E, A>` -- inclusive OR: left, right, or both (partial success with warnings)

## Dependency Injection

- [ ] `Reader<R, A>` -- dependency injection without parameter drilling
- [ ] `ReaderTask<R, A>` -- Reader + Task for async operations with dependencies
- [ ] `ReaderTaskResult<R, E, A>` -- Reader + Task + Result for real-world async with deps

## Type Safety

- [ ] `Brand<K, T>` -- nominal/branded types to prevent mixing up same-typed values
- [ ] `Refinement<A, B>` -- runtime validation with compile-time narrowing (NonEmptyString,
      PositiveNumber, etc.)

## Cross-Type Operations

- [ ] `sequence` -- convert `Array<Option<A>>` → `Option<Array<A>>` (and similar for Result, Task, TaskResult)
- [ ] `traverse` -- map + sequence in one pass over a structure

## Task Utilities

- [ ] `retry` -- re-run a `Task`/`TaskResult` on failure with configurable attempts and backoff
- [ ] `timeout` -- fail a `Task`/`TaskResult` if it doesn't resolve within a given time
- [ ] `race` -- resolve with the first of several tasks to complete
- [ ] `sequential` -- run an array of tasks one at a time, collecting results

## Advanced Patterns

- [ ] `Lens<S, A>` -- immutable nested data updates without spread chains
- [ ] `State<S, A>` -- stateful computations that thread state through operations
- [ ] `Do` notation -- generator-based monadic syntax for Option, Result, Task, TaskResult,
      TaskOption, TaskValidation
