# Roadmap

# 1.0.0

- [ ] `ReaderTask<R, A>` -- Reader + Task for async operations with dependencies
- [ ] `ReaderTaskResult<R, E, A>` -- Reader + Task + Result for real-world async with deps
- [ ] `Refinement<A, B>` -- runtime validation with compile-time narrowing (NonEmptyString,
      PositiveNumber, etc.)
- [ ] `Task.race` -- resolve with the first of several tasks to complete
- [ ] `Task.sequential` -- run an array of tasks one at a time, collecting results
- [ ] `State<S, A>` -- stateful computations that thread state through operations

# 2.0.0

- [ ] `gen()` -- generator-based syntax for Option, Result, Task, TaskResult, TaskOption,
      TaskValidation; lets you write sequential async/effectful code without nested callbacks
- [ ] `Tuple<A, B>` -- typed pair with `fst`, `snd`, `bimap`, `mapFst`, `mapSnd`, `swap`,
      `toArray`
- [ ] `Lazy<A>` -- synchronous, memoised thunk; complements `Task` for expensive pure computations
- [ ] `Logged<W, A>` -- value paired with an accumulated log; `tell`, `map`, `flatMap`, `run`
- [ ] `Resource<A>` -- safe acquire-use-release lifecycle built on `TaskResult`; ensures cleanup
      even on error
- [ ] `Predicate<A>` -- composable predicates as a first-class type; `not`, `and`, `or`,
      `contramap`, `fromRefinement`
- [ ] `Equality<A>` -- structured equality (`equals`); instances for primitives, used by `Arr.uniq`
      and `Map`
- [ ] `Ordering<A>` -- structured ordering (`compare`); instances for primitives, used by
      `Arr.sortBy`
- [ ] `Combinable<A>` -- combining algebra (`concat`); instances for string, number, boolean, Array,
      Option
- [ ] `Struct` -- lift field-level transformations over plain objects without optics boilerplate
- [ ] `Map<K, V>` -- functional operations over `globalThis.Map`; `lookup` returns `Option`, all
      operations are pure and data-last
- [ ] `Set<A>` -- functional operations over `globalThis.Set`; `member`, `insert`, `remove`,
      `union`, `intersection`, `difference`
- [ ] `Iter<A>` -- lazy iterable with `map`, `filter`, `take`, `drop`, `flatMap`, `zip`, `scan`;
      avoids materialising large intermediate arrays
- [ ] `lift2` / `lift3` -- lift a plain binary or ternary function into a context
      (`lift2(add)(Option.some(1), Option.some(2))`)
- [ ] `converge` -- apply an input to several functions independently, then combine the results
- [ ] `juxt` -- apply an array of functions to the same input and collect the results
- [ ] `on` -- apply a projection before a binary function (`on(Ordering.number, p => p.age)`)
