> [!IMPORTANT]
> **CRITICAL — prove cardinality independently.** Do not enumerate fixture families, successive await/yield/argument/branch counts, or narrate their pass counts as evidence of generality. Prove arbitrary cardinality from the canonical collection/tree/graph/worklist representation and lowering algorithm; verify semantic partitions with compact generated/property tests plus one representative high-depth stress case. A finite fixture inventory may detect regressions, but it must never define the implementation plan, completion units, or proof of coverage.

# TODO — remaining work

Scope of the full project (from the approved plan): **full ECMAScript 2026 + transpile arbitrary `node_modules`**.

Items are grouped by how soon they unblock the most user value. Within each group the ordering reflects dependency order and implementation leverage. Completed work belongs in [`done.md`](done.md), not in this TODO file.

---

## Engineering acceptance rules

These are mandatory acceptance criteria for new work, not backlog items. An exception requires a documented semantic or performance reason, a named limit where applicable, and regression coverage that would fail if the exception were accidentally broadened.

### Design and coding style

- Model arbitrary language cardinality with collections, trees, graphs, or worklists. Never add numbered semantic fields or paths such as `second` / `third` / `fourth`, one handler per branch count, or one implementation extension per await/yield/argument count.
- Keep one canonical representation and one lowering path for each semantic concept. A generalized implementation must replace and delete its fixed-shape predecessors; do not retain a generic path plus legacy count-specific fallbacks.
- Any real implementation bound must be named, centralized, justified by a platform or resource constraint, diagnosed when exceeded, and tested immediately below, at, and above the boundary. Accidental AST-shape or recursion limits are bugs.
- Separate recognition, semantic analysis, lowering, and C emission. Normalize related source shapes into a shared typed plan, IR, or control-flow graph before emission instead of growing source-shape templates in the emitter.
- Use TypeScript checker symbols, signatures, and types for identity and semantics whenever available. Do not infer binding identity, overload choice, or runtime behavior from identifier text or printer output.
- Prefer typed dispatch tables and small strategy objects over copy-pasted `if` chains. Adding a sibling operation should normally add one table entry or strategy, not another duplicated traversal.
- Keep modules and functions cohesive. New feature families belong in focused analysis/lowering/runtime modules; do not make an existing god emitter or resolver larger without recording why extraction is unsafe and leaving the touched area smaller or more structured.
- Centralize shared invariants, coercions, type mappings, name generation, ownership rules, and diagnostics. Emitter and runtime implementations must not independently redefine the same language rule.
- Do not silence type errors, C warnings, or unreachable-state checks to accommodate generated size or control-flow complexity. Refactor the representation; any narrowly unavoidable suppression must state its invariant and have a regression test.
- Tests must be organized by semantic partition and interaction, not by successive integer counts. Generate high-depth/property stress inputs from compact declarative specs, and keep one representative boundary test rather than hand-checking thousands of repetitive source lines into the repository.
- Test infrastructure must be hermetic and scope-aware: a filtered test must not rewrite unrelated fixtures or the working tree, generated artifacts belong in temporary/build directories, and test order must not affect results.
- A feature change is incomplete until its declaration surface, checker/resolution logic, IR/lowering, runtime/ABI support, positive and negative tests, and relevant documentation agree.
- Keep this file limited to actionable remaining work. Move completed implementation notes and verification records to [`done.md`](done.md) in the same change.

### TypeScript-to-C transpiler correctness

- Preserve observable ECMAScript behavior before optimizing: left-to-right evaluation, single evaluation of side effects, short-circuiting, coercion, lexical scope/TDZ/hoisting, property and prototype semantics, exceptions/finally completion, iterator closing, and async microtask ordering.
- Treat TypeScript types as compile-time evidence, not runtime truth. Erasure, `any`/`unknown`, unions, assertions, JavaScript inputs, and external modules must use sound runtime representations or an explicit unsupported diagnostic; never silently specialize away possible runtime values.
- Lower control flow through explicit basic blocks/states and completion edges. `return`, `throw`, `break`, `continue`, `yield`, and `await` must compose through nesting without adding syntax-depth-specific emitters.
- Async lowering must be a general state machine with explicit live-local capture, Promise/thenable adoption, rejection propagation, `finally` routing, and specified job ordering. No continuation may retain a pointer to expired C stack storage.
- Iterator and generator lowering must implement acquisition, `next`, abrupt completion, `return`/close, delegation, and sync/async protocol distinctions on every exit edge.
- Module lowering must preserve resolution conditions, one-time initialization, live bindings, re-exports, cycles, CommonJS interop, and deterministic dependency order. Dynamic loading/evaluation requires an explicit finite AOT proof or manifest rather than guessing.
- Make ownership and lifetime visible at every TypeScript-to-C boundary: allocation owner, GC root, borrowed/owned value, captured environment, native handle, cleanup action, and transfer point. All normal and abrupt exits must release or retain resources correctly.
- Emit portable, defined C for the supported compiler/standard matrix. Avoid signed overflow, invalid shifts, aliasing violations, unsequenced side effects, uninitialized reads, dangling pointers, and layout assumptions; use explicit-width types and checked conversions where JavaScript and C numeric semantics differ.
- Keep the generated-code ABI versioned and centralized. Runtime helpers must document argument/result ownership and exception behavior, and emitter/runtime changes that cross the ABI boundary must land and test together.
- Unsupported semantics must fail closed with a stable, source-located diagnostic. Never emit plausible C for a case whose behavior the compiler has not proved it can preserve.
- Generated C must be deterministic, hygienically named, inspectable, and traceable to TypeScript source locations. Host paths, hash-map iteration order, and unrelated build state must not perturb output.
- Differentially test observable behavior against the supported Node/JavaScript/TypeScript reference, including stdout, stderr, exit status, thrown values, ordering, and side-effect counts. Add negative-diagnostic, module-cycle, GC/lifetime, deep-control-flow, and cross-feature tests as appropriate.
- Compile generated C under the supported GCC/Clang warning profile and exercise sanitizers, leak/GC modes, optimization levels, and platform CI where practical. A transpiler test does not end when C text is produced.
- Optimize only after semantic equivalence is established. Every fast path needs a proven guard, a general semantic fallback or explicit diagnostic, and differential tests that force both paths.
- Treat source text, module specifiers, manifests, generated identifiers/literals, native addon paths, and runtime-code inputs as untrusted. Validate ranges and paths, escape generated C data, and keep dynamic capabilities allow-listed and reproducible.

## 1. Next-up unblockers

- **Phase 6 — `async`/`await` + libuv event loop**
  - Replace bounded source-shape recognizers with one control-flow/state-machine lowering for arbitrary suspension graphs in expressions and nested `if`, `switch`, loop, label, and `try` / `catch` / `finally` constructs.
  - Compute live locals and captured environments across every suspension and completion edge, including mutation, aliasing, closures, iterator cleanup, and abrupt completion.
  - Complete Promise/thenable adoption, combinator iterable handling, rejection propagation, and microtask ordering for all async function forms without synchronous fallbacks for direct-await shapes.
  - Make `for await...of`, async disposal, and libuv-backed APIs consume the same general async IR instead of dedicated continuation templates.

---

## 2. Dependent phases

- **Dispatch concurrency (optional, libdispatch-backed) — remainder** (design/status: [`dispatch_async_todo.md`](dispatch_async_todo.md))
  - Remaining work: `Shared<T>`/queue-confinement capture escape hatches beyond const primitives; broader task return types beyond number/string/boolean/array/Map/Set/Date/RegExp/Error/Buffer/URL/URLSearchParams/ArrayBuffer/DataView/TextEncoder/TextDecoder/void; relaxing the awaited-shape dependence once Phase 6 general state-machine lowering lands (dispatch promises awaited outside the recognized continuation subsets currently hit the pending-await bail); and a many-thread GC soak + TSan CI configuration and a CI job that builds libdispatch from source.

- **Phase 7 remainder — ES language features**
  - Replace bounded generator templates with one lazy state-machine lowering for arbitrary expression trees, control flow, labels, and `try` / `catch` / `finally` completion routing.
  - Complete `yield` and `yield*` staging for calls, construction, spreads, mutations, computed receivers/keys, logical/conditional expressions, loop headers, and abrupt iterator completion.
  - Implement `async function*`, async iterator delegation, and the remaining sync/async iterator-protocol and IteratorClose edge cases.
  - Complete call-spread lowering for arbitrary spread positions, nested yielded spreads, and general call/member mutation graphs.

---

## 3. Broad surface areas

- **Phases 11–13 — async Node stdlib**
  - Finish the `fs.promises` and `FileHandle` API/option/result matrix on libuv, with AbortSignal cancellation, descriptor lifetime, ordering, and platform error parity.
  - Generalize `events.on` / `events.once` and `for await...of` consumption through the Phase 6 async IR, including arbitrary bindings, body control flow, IteratorClose, backpressure, cancellation, and error-object identity.
  - Implement full readable, writable, transform, and pipe stream behavior; complete socket/server/DNS options and lifecycle semantics; and route scheduling APIs through the shared event-loop ordering model.
  - Complete child-process lifecycle and stream semantics, `spawn` / `spawnSync` options, `fork`, `cluster`, and `worker_threads` with structured-clone messaging.

- **Phase 14 — npm integration**
  - Complete CommonJS wrapper and `module.exports` mutation analysis for arbitrary statically provable package-source control flow, computed export keys, factory/IIFE forms, aliases, and destructuring.
  - Generalize finite dynamic-`require` proofs and manifests while keeping every reachable module in the AOT closure; unknown runtime loading must remain an explicit gated capability.
  - Preserve ESM live bindings, re-exports, cycles, conditional exports/imports, and CJS default/named/namespace interop across TypeScript and `allowJs` package graphs.
  - Validate the arbitrary-`node_modules` target against a versioned real-package compatibility corpus rather than accumulating package-specific source-shape recognizers.

- **Phase 15 — perf & polish** (ongoing)
  - Compiler architecture debt: introduce explicit typed IR/pass boundaries and extract async/generator lowering, expression planning, module interop, and C emission from the 97k-line `src/emit/index.ts`; split the 18k-line Node runtime by subsystem behind a documented internal ABI, with behavior-preserving differential tests before moving feature ownership.
  - Generalize hidden-class/property caches and interprocedural escape analysis across dynamic objects, closures, returns, loops, mutations, and receiver-returning methods without weakening ownership guarantees.
  - Add IR-level dead-code elimination and size optimization after semantic lowering, with equivalence tests that cover side effects, allocation observability, exceptions, and module initialization.
  - Expand sanitizer, GC/no-GC, optimization, compiler, and platform CI across Linux GCC/Clang, macOS, and Windows.
