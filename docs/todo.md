# TODO — remaining work

Scope of the full project (from the approved plan): **full ECMAScript 2026 + transpile arbitrary `node_modules`**.

Items are grouped by how soon they unblock the most user value. Within each group the ordering reflects dependency order and implementation leverage. Completed work belongs in [`done.md`](done.md), not in this TODO file.

---

## 1. Next-up unblockers

This is the next item that most directly expands what programs can be written against `tsc2c`.

- **Phase 6 — `async`/`await` + libuv event loop**
  - Remaining work: general multi-suspension `await` state-machine lowering beyond the current bounded direct tail-await, awaited-alias, assignment-awaited-alias, single-await, embedded return-await, local initializer-return, assignment-return, source `try`/`catch`/`finally`, and leading awaited-local continuation subsets; broader `await` inside nested control-flow constructs and loops beyond the covered single-await post-await synchronous statement subsets for methods/declarations/function values and leading awaited-local chains with void sequencing; broader awaited expressions outside the current leading local declaration, expression-statement, `return await`, and source `try` recognizer edge cases beyond transparent fulfilled/catch return, catch throw, finally-throw override, catch-prelude wrappers, combined catch-plus-finally routing for declarations/lifted function values/nested closures/methods/finally-throw overrides and combined catch/finally-prelude locals, direct `return await` source/try/catch/finally prelude routing, and combined catch-plus-finally initialized/later-assigned pre-`try` body and in-`try` local prelude routing; broader locals that must survive across general suspension points beyond the current primitive, dynamic, typed Promise, typed array/object/class/function, typed collection, typed RegExp, typed Node crypto/events/fs object, Event/EventTarget, Date/Error/AggregateError, URL/URLSearchParams, Buffer/ArrayBuffer/DataView, TextEncoder/TextDecoder, and symbol prelude captures; broader thenable assimilation edge cases outside the current immediate and microtask-delayed settled/nested/self-resolution/cycle coverage and dynamic `Promise.all`/`race`/`any`/`allSettled` iterable input shapes beyond covered delayed nested-array, delayed nested-Set, Map entry-iteration, string iterable, generator-backed iterable, array-backed custom iterable class, custom iterator-object class, and direct self-iterable iterator object cases; full async function edge cases beyond the current declaration, method, lifted function-value, closure function-value, and expression-bodied async-arrow continuation routing; and future async I/O on top of libuv.

---

## 2. Dependent phases

- **Phase 7 remainder — ES language features**
  - Remaining work: general lazy generator state-machine lowering beyond the current bounded sequential subset, bidirectional `.next(value)` into arbitrary suspended `yield` expressions, `try` control flow across suspension points, `async function*`, broader iterator protocol edge cases beyond the current array/string/Map/Set/custom/dynamic and materialized/lazy generator-backed `yield*` subsets, and async iterables.

- **Phase 9 — `Proxy` + `Reflect`**
  - Remaining work: broader ECMAScript proxy edge-case validation beyond the currently covered callable/newable identity, forwarding, revocation, array identity, result/invariant validation, construct default `newTarget`, and Reflect target validation paths.

---

## 3. Broad surface areas

- **Phases 11–13 — async Node stdlib**
  - Phase 11 remaining work: true libuv-backed asynchronous `fs.promises` I/O, broader filesystem option objects, broader `events` async iterator helpers, full readable/writable/transform/pipe stream behavior, broader `net` sockets/connect/listen APIs, broader `dns` options, and libuv-backed scheduling.
  - Phase 12 remaining work: `http` / `https` on OpenSSL plus best-effort `http2`.
  - Phase 13 remaining work: real async child-process lifecycle handles/events/streams, `fork`, broader `spawn` / `spawnSync` options beyond the current subset, `cluster`, and `worker_threads` with structured-clone messages.

- **Phase 14 — npm integration**
  - Remaining work: arbitrary dynamic computed named-export metadata without a finite syntax-, checker-, or manifest-proven AOT key set; remaining runtime-computed whole-value `module.exports = ...` expression forms not covered by the current boxed AOT default paths; deeper CommonJS wrapper behavior beyond the finite static require wrapper subset; broader finite dynamic-require specifier proof classes beyond the currently documented finite AOT subsets and manifest allow-list subsets; and broader mixed CJS/ESM interop edge cases. Dependency init stays eager through the AOT module graph by design.
  - Basic `allowJs: true` package-source loading is implemented for pure ESM JavaScript packages, including transitive package-local side-effect/default/namespace imports, transitive default/namespace re-export barrels over package-local JavaScript modules, default/named/namespace imports, default-forwarded named default imports, package namespace imports through default-forwarded, default-re-exported, and namespace-re-exported dependencies, and default-forward/default/named/aliased/namespace/export-star re-exports from external CommonJS object-literal package dependencies, default re-export forwarding from package-local CommonJS helpers, named default imports from default-forwarded CommonJS helpers, and default/named/namespace imports plus default/named/aliased/namespace/export-star re-exports, named imports from export-star re-exports, and package namespace imports through default-forwarded, default, aliased named, or namespace re-exports of package-local CommonJS object-literal helpers emitted as finite named members; broader JS package patterns remain active work.

- **Phase 15 — perf & polish** (ongoing)
  - Remaining work: deeper hidden-class cache work; broader escape analysis for dynamic objects, closures, returns, interprocedural ownership, dynamic or non-finite loop growing array methods, and escaping receiver-returning mutating array method result flows; broader source-level generated-C DCE beyond the current provably safe patterns; further binary-size optimization; and CI matrix expansion beyond Linux gcc/clang to macOS and Windows.
