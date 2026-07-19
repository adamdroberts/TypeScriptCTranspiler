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
  - Remaining work: arbitrary dynamic computed named-export metadata without a finite syntax-, checker-, or manifest-proven AOT key set; remaining runtime-computed whole-value `module.exports = ...` expression forms not covered by the current boxed AOT default paths; deeper CommonJS wrapper behavior beyond the finite static require wrapper subset; broader finite dynamic-require specifier proofs beyond the current literal, concatenation, template, path helper, collection lookup, Array.of/from/copy/copyWithin/every/fill/filter/find/findIndex/findLast/findLastIndex/flat/flatMap/map/pop/push/reduce/reduceRight/reverse/shift/some/sort/splice/toReversed/toSorted/unshift/with/toSpliced finite collection wrappers, Set has/keys/values/entries/size/union/intersection/difference/symmetricDifference/subset-superset-disjoint relations and Map has/get/keys/values/entries/size/groupBy finite constructor fragments, object-literal spread collection wrappers, Object.fromEntries array-entry/Map-backed/URLSearchParams-backed and Object.entries object-literal collection wrappers, Object.assign finite collection wrappers, Object.groupBy finite collection wrappers, Object descriptor-built collection wrappers, Object integrity/setPrototypeOf collection wrappers, and Object-prototype valueOf collection wrappers, enum/union/template-literal type, Boolean/String/Number/BigInt constructor coercions, Array predicates, Number/global numeric predicates, finite Math/Number constants, deterministic Math helpers, Date instance metadata/UTC getters/UTC setters/UTC-stringifiers/parse/UTC, numeric parsers, Buffer byteLength-string/byteLength-buffer/isEncoding/isBuffer/from-string/from-array/alloc/allocUnsafe/index/length/valueOf/toJSON/own-key-lists/own-predicates/reflect-get-has/descriptor-property/integer-reads/integer-writes/float-reads/float-writes/compare/compare-ranges/copy/write/equals/search/search-encoding/slice-subarray/fill/swap-toString/toLocaleString/concat-toString, ArrayBuffer/DataView constructor, buffer, and const-alias metadata, TextEncoder encode/TextDecoder decode UTF-8 fragments, URL constructor metadata/stringifiers, URL.canParse, base64 globals, URLSearchParams toString/get/has/getAll/keys/values/entries/size/finite iterable entries, JSON.parse/stringify, RegExp escape/constructor metadata/stringifiers/test/exec length, URI encode/decode, string constructor/identity/case/trim/slice-substring-substr-range/search-predicate/split/match/replace/repeat/pad/normalize/method-bracket-and-code-indexing, Object keys/values/own-property-names/entries/hasOwn/prototype-own/prototype-toString/Object.is/integrity/descriptor-property/descriptor-map-property predicates, Reflect get/has/ownKeys/descriptor-property, and manifest allow-list subsets; and broader mixed CJS/ESM interop edge cases. Dependency init stays eager through the AOT module graph by design.
  - Basic `allowJs: true` package-source loading is implemented for pure ESM JavaScript packages; broader JS package patterns remain active work.

- **Phase 15 — perf & polish** (ongoing)
  - Remaining work: deeper hidden-class cache work; broader escape analysis for dynamic objects, closures, returns, interprocedural ownership, dynamic or non-finite loop growing array methods, and escaping receiver-returning mutating array method result flows; broader source-level generated-C DCE beyond the current provably safe patterns; further binary-size optimization; and CI matrix expansion beyond Linux gcc/clang to macOS and Windows.
