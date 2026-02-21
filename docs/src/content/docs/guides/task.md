---
title: Task — async operations
description: Lazy async computations that don't start until you say so, and compose like any other function.
---

Promises are excellent at representing async work, but they have a quirk that's easy to overlook: a Promise is already running the moment you create it. You can't hold one, decide when to start it, or compose it with another one before any work begins. `Task<A>` is a function that returns a `Promise<A>`. The work doesn't start until you call it — which makes Tasks composable, testable, and easy to reason about before they run.

## The problem with Promises

A `Promise` starts the moment it's created:

```ts
const p = fetch("/api/user"); // network request starts immediately
```

This makes it hard to describe what an operation should do without also starting it. You can't build a pipeline of async steps and pass it around or delay it — by the time you have the Promise in hand, it's already in flight.

## The Task approach

A `Task<A>` is just a zero-argument function returning a `Promise<A>`:

```ts
type Task<A> = () => Promise<A>
```

The key difference: nothing happens until you call it.

```ts
import { Task } from "@nlozgachev/pipekit/Core";
import { pipe } from "@nlozgachev/pipekit/Composition";

const fetchUser: Task<User> = () => fetch("/api/user").then((r) => r.json());

// Nothing has happened yet. fetchUser is just a function.

const pipeline = pipe(
  fetchUser,
  Task.map((user) => user.name),
);

// Still nothing. pipeline is a new Task<string>.

const result = await pipeline(); // NOW the request runs
```

The pipeline is built first, then executed once by calling it. You can pass it around, compose it further, or call it multiple times.

## Creating Tasks

```ts
Task.of(42);               // Task that resolves to 42 immediately
Task.from(() => fetchData()); // Task from any Promise-returning function
```

`Task.from` is an explicit alias for writing `() => somePromise()`. It's mainly useful for clarity:

```ts
const getUsers: Task<User[]> = Task.from(() =>
  fetch("/users").then((r) => r.json())
);
```

## Transforming with `map`

`map` transforms the resolved value without running the Task:

```ts
pipe(
  Task.of(5),
  Task.map((n) => n * 2),
)(); // Promise resolving to 10
```

Chaining maps builds a description of the transformation; the actual async work happens when you call the result.

## Sequencing with `chain`

`chain` sequences two async operations where the second depends on the result of the first:

```ts
const fetchUser = (id: string): Task<User> =>
  Task.from(() => fetch(`/users/${id}`).then((r) => r.json()));

const fetchPosts = (user: User): Task<Post[]> =>
  Task.from(() => fetch(`/posts?userId=${user.id}`).then((r) => r.json()));

const userPosts: Task<Post[]> = pipe(
  fetchUser("123"),
  Task.chain(fetchPosts),
);

await userPosts(); // fetches user, then fetches their posts
```

Each step waits for the previous one to resolve before starting.

## Running Tasks in parallel with `all`

`Task.all` takes an array of Tasks and runs them simultaneously, collecting all results:

```ts
const [user, settings, notifications] = await Task.all([
  fetchUser(id),
  fetchSettings(id),
  fetchNotifications(id),
])();
```

The return type is inferred from the input tuple — if you pass `[Task<User>, Task<Settings>]`, you get back `Task<[User, Settings]>`.

## Delaying execution

`Task.delay` adds a pause before the Task runs:

```ts
pipe(
  Task.of("ping"),
  Task.delay(1000),
)(); // resolves to "ping" after 1 second
```

Useful for debouncing or rate limiting.

## Repeating Tasks

Unlike retry — which re-runs a computation in response to failure — `repeat` and `repeatUntil` run a Task multiple times unconditionally. This fits naturally with Task's guarantee that it never fails.

`Task.repeat` runs a Task a fixed number of times and collects every result:

```ts
pipe(
  pollSensor,
  Task.repeat({ times: 5, delay: 1000 }),
)(); // Task<Reading[]> — 5 readings, one per second
```

`Task.repeatUntil` keeps running until the result satisfies a predicate, then returns it. This is the natural shape for polling:

```ts
pipe(
  checkDeploymentStatus,
  Task.repeatUntil({ when: (s) => s === "ready", delay: 2000 }),
)(); // checks every 2s until the deployment is ready
```

Both accept an optional `delay` (in ms) inserted between runs. The delay is not applied after the final run.

## The Task family

`Task<A>` is for async operations that always succeed. When failure is possible, use the specialised variants:

**`TaskResult<E, A>`** — an async operation that can fail with a typed error. It's `Task<Result<E, A>>` under the hood:

```ts
import { TaskResult } from "@nlozgachev/pipekit/Core";

const fetchUser = (id: string): TaskResult<string, User> =>
  TaskResult.tryCatch(
    () => fetch(`/users/${id}`).then((r) => r.json()),
    (e) => `Fetch failed: ${e}`,
  );

const name = pipe(
  fetchUser("123"),
  TaskResult.map((user) => user.name),
  TaskResult.getOrElse("Unknown"),
);

await name(); // "Alice" or "Unknown"
```

**`TaskOption<A>`** — an async operation that may return nothing. It's `Task<Option<A>>`:

```ts
import { TaskOption } from "@nlozgachev/pipekit/Core";

const findUser = (id: string): TaskOption<User> =>
  TaskOption.tryCatch(() => db.users.findById(id));

const displayName = pipe(
  findUser("123"),
  TaskOption.map((user) => user.name),
  TaskOption.getOrElse("Guest"),
);

await displayName();
```

`TaskOption.tryCatch` catches any rejection and converts it to `None` — useful when you treat a failed lookup the same as a missing value.

**`TaskValidation<E, A>`** — an async operation that accumulates errors. Used for async validation where all checks should run regardless of individual failures.

All three follow the same API conventions as their synchronous counterparts (`map`, `chain`, `match`, `getOrElse`, `recover`). If you've used `Result`, `TaskResult` will be immediately familiar.

## Running a Task

A Task is just a function. To run it, call it:

```ts
const task: Task<number> = Task.of(42);
const result: number = await task();
```

For `TaskResult` and `TaskOption`, the result is a wrapped value:

```ts
const taskResult: TaskResult<string, number> = TaskResult.of(42);
const result: Result<string, number> = await taskResult(); // Ok(42)
```

Most of the time you'll call the pipeline at one point — the outer boundary where your application produces a final result or triggers a side effect.

## When to use Task vs async/await

Use `Task` when:
- You want to build a pipeline of async steps that you can compose, pass around, or delay before executing
- You need parallel execution via `Task.all` within a pipeline
- You want typed error handling with `TaskResult` instead of try/catch around async functions

Keep using `async/await` directly when:
- The operation is a one-liner with no composition needed
- You're inside a function body and the imperative style is clearer
- You're working with code that isn't pipeline-oriented

The two styles interoperate freely. `Task.from(() => someAsyncFunction())` wraps any async function into a Task, and calling a Task gives back a plain Promise that async/await handles normally.
