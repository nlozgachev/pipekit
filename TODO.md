# pipekit — 1.0.0 Roadmap

## Dependency Injection

- [ ] `Reader<R, A>` -- dependency injection without parameter drilling
- [ ] `ReaderTask<R, A>` -- Reader + Task for async operations with dependencies
- [ ] `ReaderTaskResult<R, E, A>` -- Reader + Task + Result for real-world async with deps

## Type Safety

- [ ] `Refinement<A, B>` -- runtime validation with compile-time narrowing (NonEmptyString,
      PositiveNumber, etc.)

## Cross-Type Operations

- [ ] `sequence` -- convert `Array<Option<A>>` → `Option<Array<A>>` (and similar for Result, Task,
      TaskResult)
- [ ] `traverse` -- map + sequence in one pass over a structure

## Task Utilities

- [ ] `race` -- resolve with the first of several tasks to complete
- [ ] `sequential` -- run an array of tasks one at a time, collecting results

## Advanced Patterns

- [ ] `Lens<S, A>` -- immutable nested data updates without spread chains
- [ ] `State<S, A>` -- stateful computations that thread state through operations
- [ ] `Do` notation -- generator-based monadic syntax for Option, Result, Task, TaskResult,
      TaskOption, TaskValidation
