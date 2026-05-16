# Project Rules

## Iron Law #1: Pure Function Abstraction

**All data methods that can be abstracted as pure functions must be abstracted. This project must be built using functional programming principles.**

### Specific Guidelines

1. **Data Transformations**: Any logic that converts input data to output data—without depending on external state or producing side effects—must be abstracted as a pure function.

2. **Side Effect Isolation**: I/O, network requests, UI updates, state mutations, and other side-effecting operations must be strictly separated from pure data logic, placed in dedicated boundary layers (e.g., `sideEffects/`, `io/`, or similar modules).

3. **Immutable Data**: Prefer `readonly`, `as const`, and immutable data structures. Avoid shared mutable state. Use spread operators or `Immer` to produce new objects rather than mutating in place.

4. **Composition Over Inheritance**: Build complex logic through function composition and higher-order functions rather than deep class hierarchies. TypeScript has no built-in `compose`/`pipe`—implement them yourself or introduce a lightweight FP library (e.g., `effect`, `fp-ts`).

5. **Type-Driven Design**: Leverage TypeScript's strong type system to explicitly express function input/output contracts through types, reducing runtime errors.

6. **Pipeline-Style Processing**: Workflow-oriented operations should use the pipeline pattern—decompose complex flows into a series of independent pure function steps, chained via a custom `pipe(f, g, h)` or method chaining, where each step's output is the next step's input. Pipelines should have:
   - Each step is an independently testable pure function
   - No shared state between steps—data flows through arguments only
   - Step order is flexible: easy to reorder, insert, or remove
   - Errors propagate along the pipeline, never swallowed inside a step

7. **Declarative Over Imperative**: Describe *what* you want, not *how* to do it. Use `arr.filter(x => x.isActive)` to express intent rather than hand-written for-loops with if-conditions. Declarative code reads closer to requirements—more readable, more maintainable, less error-prone.

8. **Higher-Order Functions First**: Functions are first-class citizens. Frequently use patterns that accept or return functions. Go beyond `map`/`filter`/`reduce`—write custom higher-order functions to replace boilerplate and repetitive logic. They are the most powerful tool for eliminating duplication.

9. **Currying and Partial Application**: Decompose multi-parameter functions into single-parameter chains (`(a: A, b: B) => C` → `(a: A) => (b: B) => C`), where each step has a single responsibility. Partial application fixes context parameters to produce specialized functions, greatly improving reuse and testability.

10. **Monadic Chaining**: For context-bearing computations—optionals (`T | null`), fallible operations (custom `Result<T, E>` type), async (`Promise<T>`), collections (`T[]`)—use chainable operations uniformly: `.map()/.flatMap()` for `T[]`, `.then()` for `Promise`, custom `map/flatMap` methods for `Result`. Avoid nested if-else or try-catch pyramids. Chaining makes "context traversal" transparent.

11. **Algebraic Data Types (ADTs)**: Use discriminated unions and interfaces to precisely model domain states—make illegal states unrepresentable. The compiler then eliminates entire categories of bugs without any runtime defense.

12. **Pattern Matching and Exhaustiveness**: For discriminated unions with many branches (≥4) that are likely to grow, use exhaustive pattern matching (switch + assigning the matched value to a `never`-typed variable in the `default` branch) to let the compiler catch missed branches. For small, stable unions, forcing `never` guards is unnecessary noise. Exhaustiveness turns "missed handling" from a runtime error into a compile-time error.

13. **Referential Transparency**: Any function call should be replaceable with its return value without changing program behavior. Violations of referential transparency must be explicitly marked (e.g., a comment noting side effects), making side effects "visible" in the codebase.

14. **Lazy Evaluation**: Defer computation until the result is actually needed, especially for large datasets or expensive operations. Use generators (`function*`), `Iterable`, or lazy patterns to postpone evaluation and avoid unnecessary intermediate allocations.

15. **Recursion Over Loops**: Prefer recursion or `reduce` for traversal and accumulation. Recursive structures eliminate loop variables, index-out-of-bounds errors, and mutable accumulators—clearer and easier to prove correct. Note: Node.js/V8 does not implement tail-call optimization (TCO); for deep recursion, always use `reduce` or iterative loops to avoid stack overflow.

16. **Construction Separate from Side Effects**: Object creation/initialization must not trigger side effects (network requests, file I/O, console output). "Constructing a value" should be a pure operation; side effects execute only on explicit invocation.

17. **Practices in TypeScript**:
   - Model data with `interface` + discriminated unions
   - Place data transformation logic in standalone pure functions; do not mix side effects into class methods
   - Process collections with `map`, `flatMap`, `filter`, `reduce`, and other higher-order functions (note: `forEach` is a side-effect operation—do not use it in pure functions)
   - Chain data processing steps with custom `pipe`/`compose` or method chaining
   - Express fallible operations with `throw` or a custom `Result<T, E>` type; avoid returning `null` and losing error information
   - Use generators (`function*`) for lazy sequences to avoid intermediate array allocations
   - Constructors should only assign values—no I/O
   - Abstract side-effect operations behind interfaces for testability and substitutability

## Iron Law #2: Strict Test-Driven Development (TDD)

**All feature code must be test-first. The project must maintain comprehensive unit and integration test coverage.**

### Specific Guidelines

1. **Red-Green-Refactor Cycle**: Write a failing test first (red), write the minimal code to make it pass (green), then refactor. No feature code may be committed without a corresponding test.

2. **Test First**: Upon receiving a requirement, the first step is writing test cases that describe expected behavior—not jumping into implementation. Tests are documentation: reading them should explain what a module does.

3. **Unit Tests**: Every pure function, data transformation, and business logic rule must have independent unit tests. Tests must be fast, side-effect-free, and repeatable. Each test verifies exactly one behavior.

4. **Integration Tests**: Cross-module collaboration and interactions with external dependencies (LLM APIs, file systems) must have integration tests. Integration tests verify assembled component behavior, not internal details.

5. **Test Names Express Intent**: Test names should describe behavior and expectations, not implementation details. `should return empty array when filter matches nothing` over `testFilter`.

6. **Boundaries and Exceptions**: Must cover the happy path, edge cases (empty input, extreme values, null/undefined), and failure paths (thrown errors, Promise rejections).

7. **Side Effects Testable**: Through Iron Law #1's side-effect isolation, use dependency injection or interface abstractions to replace external dependencies, making side-effect code mockable/stubable.

8. **Coverage Threshold**: Core business logic line coverage must not fall below 80%. Don't chase 100%—over-mocked tests are more harmful than no tests. Focus on branch logic and state transitions, not getters/setters.

9. **Tests as a Safety Net**: Tests must remain passing during refactoring. If refactoring causes widespread test failures, tests are coupled to implementation details rather than behavior—fix the test design first.

10. **Practices in TypeScript**:
   - Use `vitest` as the test framework
   - Pure function tests: call directly, assert output, no mocks
   - Side-effect tests: inject mock dependencies via interfaces
   - Type-safety tests: use `expectTypeOf` to verify correct type inference
   - Async tests: `async/await` + `expect().rejects` for Promises
   - Snapshot tests only for serialized output (e.g., CLI output format), never for business logic

## Iron Law #3: Strict Type Safety

**TypeScript's type system is the first line of defense. Bypassing type checks bypasses all iron laws.**

### Specific Guidelines

1. **Strict Mode Always On**: `tsconfig.json` must enable `strict: true`. No `noImplicitAny: false` or other partial relaxations.

2. **No `any`**: `any` is the type system's escape hatch—equivalent to having no types at all. Use `unknown` instead, which requires type narrowing before use. The sole exception: temporary transitions with third-party JS libraries, which must carry a `// TODO: remove any` comment and be tracked.

3. **No Non-Null Assertions**: `obj!.prop` bypasses null checks, deferring compile-time issues to runtime. Use optional chaining `obj?.prop` or type guard narrowing instead.

4. **No `@ts-ignore` / `@ts-expect-error`**: Suppressing errors ≠ fixing errors. If type definitions are wrong, fix the definitions. If a third-party library lacks types, contribute a `.d.ts` or use `declare module` to fill the gap.

5. **Explicit Return Types**: Public and exported functions must declare their return types. Make interface contracts visible—don't rely solely on type inference.

6. **ADT Modeling**: Model states with discriminated unions, letting the compiler—not runtime—guarantee exhaustive handling (consistent with Iron Law #1, guidelines 11–12).

7. **Branded Types to Prevent Mix-Ups**: Isomorphic types (e.g., `userId: string` vs `orderId: string`) must use the branded type pattern to prevent argument mix-ups. TS has no built-in support; implement as: `type UserId = string & { readonly __brand: unique symbol }`, constructed via factory functions. Types should be constraints, not just documentation.

## Iron Law #4: Explicit Error Handling

**Errors are part of business logic and must be explicitly modeled and handled. Silently swallowing errors is forbidden.**

### Specific Guidelines

1. **Errors as Data**: Expected failures (file not found, network timeout, validation failure) must not throw exceptions. Model them as part of the return value using the `Result<T, E>` pattern (`{ ok: true, value: T } | { ok: false, error: E }`), forcing callers to handle the failure path.

2. **Exceptions for Unrecoverable Errors**: Program bugs (accessing properties on `null`/`undefined`, array index out of bounds) should use `throw`. Callers must not try-catch these—let the process crash and fix the bug rather than masking it.

3. **Error Propagation Up the Call Stack**: Errors must propagate upward to the layer that can handle them. Intermediate layers must not swallow errors. If an intermediate layer needs to attach context, wrap and rethrow: `catch (e) { throw new AppError('Failed to parse config', { cause: e }) }`.

4. **No Empty Catch Blocks**: `catch (e) {}` is a code smell. If an error genuinely should be ignored, a comment must explain why: `catch (e) { /* Expected: use default when file does not exist */ }`.

5. **Layered Error Types**: Define a project-level error type hierarchy (e.g., `AppError > NetworkError > TimeoutError`) rather than littering `throw new Error('something went wrong')` everywhere. Typed errors allow callers to handle failures at the appropriate granularity.

6. **Synergy with Iron Law #1**: Pure functions don't throw—they return `Result`. Side-effect functions may throw, but boundary layers must catch and convert to `Result`. Error handling itself is expressed as pure functions (`mapError`, `match`).

7. **No Unhandled Async Errors**: All `Promise` rejections must be handled. Inside `async` functions, wrap expected failures with `Result`; let unexpected ones propagate naturally. Top-level entry points (`main`) must have a global catch-all.

## Skill Graph Routing Rules

When receiving a user message, first classify intent:

### Direct Answer (direct)
Match: pure Q&A, concept explanation, code snippet requests, chat, no operational intent
Action: respond directly; do not invoke any skill

### Tool Dispatch (tool)
Match: action verb + explicit tool reference (e.g., "query database", "call API", "send message", "run migration")
Action: invoke the `tool-dispatcher` subagent

### Professional Workflow (compound)
Match: matches the description trigger scenario of any compound SKILL.md
Action: `read` the corresponding compound SKILL.md; execute the three-tier molecule → atom workflow

### Ambiguous
When none of the above match, determine the optimal path independently
