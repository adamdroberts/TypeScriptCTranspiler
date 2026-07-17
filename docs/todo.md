# TODO — remaining work

Scope of the full project (from the approved plan): **full ECMAScript 2026 + transpile arbitrary `node_modules`**.

Items are grouped by how soon they unblock the most user value. Within each group the ordering reflects dependency order and implementation leverage. Completed work belongs in [`done.md`](done.md), not in this TODO file.

---

## 1. Next-up unblockers

This is the next item that most directly expands what programs can be written against `tsc2c`.

- **NaN-boxed dynamic value runtime — Phase 3 remainder**
  - Remaining work: complete built-in array prototype behavior beyond the inherited dynamic array method/string subset and the existing typed/dynamic array method subset; remaining descriptor/prototype edge cases not covered by the completed sparse dynamic search, callback-method, inherited-aware search, `at`, `concat`/`slice`/`splice`, `join`/stringification, `values`/`entries` iteration, `push`/`pop`/`shift`/`unshift`, `fill`, `sort`, `reverse`/`copyWithin`, and dense change-by-copy inherited-index semantics, array/function prototype cycle rejection, boxed function `prototype` metadata descriptors, ordinary function own string-key properties, function own accessor descriptors, dynamic array own accessor descriptors, and matching function/array-target Proxy invariant slices. Shape diagnostics and hidden classes / shape trees with shape-shared inline caches are implemented.

---

## 2. Dependent phases

- **Phase 6 — `async`/`await` + libuv event loop**
  - Remaining work: suspend/resume `await` state-machine lowering, broader thenable assimilation edge cases outside the immediate dynamic settled/nested/self-resolution/cycle and executor-resolved thenable/nested-promise subset, full async function edge cases, and future async I/O on top of libuv.

- **Phase 7 remainder — ES language features**
  - Remaining work: general lazy generator state-machine lowering beyond the current bounded sequential subset, bidirectional `.next(value)` into arbitrary suspended `yield` expressions, `try` control flow across suspension points, `async function*`, broader iterator protocol edge cases including lazy generator-backed iterables beyond the narrow subset, and async iterables.

- **Phase 9 — `Proxy` + `Reflect`**
  - Remaining work: broader ECMAScript proxy edge-case validation beyond the currently covered callable/newable identity, forwarding, revocation, array identity, result/invariant validation, construct default `newTarget`, and Reflect target validation paths.

---

## 3. Broad surface areas

- **Phases 11–13 — async Node stdlib**
  - Phase 11 remaining work: true libuv-backed asynchronous `fs.promises` I/O, broader filesystem option objects, broader `events` async iterator helpers, full readable/writable/transform/pipe stream behavior, broader `net` sockets/connect/listen APIs, broader `dns` options, and libuv-backed scheduling.
  - Phase 12 remaining work: `http` / `https` on OpenSSL plus best-effort `http2`.
  - Phase 13 remaining work: real async child-process lifecycle handles/events/streams, `fork`, broader `spawn` / `spawnSync` options beyond the current subset, `cluster`, and `worker_threads` with structured-clone messages.

- **Phase 14 — npm integration**
  - Remaining work: arbitrary dynamic computed named-export metadata without a finite syntax-, checker-, or manifest-proven AOT key set; remaining runtime-computed whole-value `module.exports = ...` expression forms not covered by the current boxed AOT default paths; deeper CommonJS wrapper behavior beyond the finite static require wrapper subset; and broader mixed CJS/ESM interop edge cases. Dependency init stays eager through the AOT module graph by design.
  - Basic `allowJs: true` package-source loading is implemented for pure ESM JavaScript packages; broader JS package patterns remain active work.

- **Phase 15 — perf & polish** (ongoing)
  - Remaining work: deeper hidden-class cache work; broader escape analysis for dynamic objects, closures, returns, interprocedural ownership, dynamic or non-finite loop growing array methods, and escaping receiver-returning mutating array method result flows; broader source-level generated-C DCE beyond the current provably safe patterns; further binary-size optimization; and CI matrix expansion beyond Linux gcc/clang to macOS and Windows.
