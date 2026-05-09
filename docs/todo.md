# TODO — remaining work

Scope of the full project (from the approved plan): **full ECMAScript 2026 + transpile arbitrary `node_modules`**. At the current pace, what's done is roughly 65–75% of the 15-phase plan. The rest is measured in weeks and months, not hours.

Items are grouped by how soon they unblock the most user value. Within each group the ordering reflects dependency + estimated effort.

---

## 1. Next-up unblockers

This is the next item that most directly expands what programs can be written against `tsc2c`.

- **NaN-boxed dynamic value runtime — Phase 3 remainder** (~1–2+ weeks)
  - Done foundation: `tsc_value_t` exists as a NaN-boxed `uint64_t`; `any` / `unknown` and heterogeneous unions map to it; `JSON.parse`, dynamic JSON stringify, heterogeneous arrays/objects, dynamic property/index access, dynamic property writes/compound writes, dynamic array index writes/compound writes, dynamic `in`/`delete`, dynamic binary/logical/nullish operators, broader dynamic string/array methods including `at`, `concat`, `copyWithin`, `fill`, `lastIndexOf`, `localeCompare`, `normalize`, `padStart`/`padEnd`, `repeat`, `replace`, `replaceAll`, `split`, `substring`, `toReversed`, `toSorted`, `toSpliced`, `with`, `trimStart`/`trimEnd`, `flat`, default `sort`, `splice`, and inline-arrow array HOFs including `reduceRight`/`findLast`/`findLastIndex`, mixed dynamic ternary boxing, dynamic `Array.isArray`/`Array.from`/`Array.of`, typed unbox/coercion bridges, enumerable `Object.keys`/`Object.values`/`Object.entries`, dynamic `Object.fromEntries`, `Object.is`, `Object.assign`/`Object.getOwnPropertyNames`/`Object.getOwnPropertyDescriptors`/`Object.hasOwn`, dynamic `Object.prototype.hasOwnProperty`/`isPrototypeOf`/`propertyIsEnumerable`/`toLocaleString`/`toString`/`valueOf`, dynamic data descriptor flags, named-function accessor descriptors, dynamic object extensibility/seal/freeze state, dynamic `Object.create`/prototype-chain lookup, and basic Reflect object helpers are implemented. Tests: `dynamic_values`, `dynamic_ops`, `dynamic_property_assignment`, `dynamic_index_assignment`, `dynamic_property_ops`, `dynamic_methods`, `dynamic_last_index_of`, `dynamic_string_at`, `dynamic_string_concat`, `dynamic_string_locale_compare`, `dynamic_string_normalize`, `dynamic_string_pad_repeat`, `dynamic_string_replace`, `dynamic_string_split`, `dynamic_string_substring`, `dynamic_string_trim_edges`, `dynamic_array_methods`, `dynamic_array_at`, `dynamic_array_copy_within`, `dynamic_array_fill`, `dynamic_array_find_last`, `dynamic_array_flat`, `dynamic_array_of`, `dynamic_array_sort`, `dynamic_array_splice`, `dynamic_array_to_reversed`, `dynamic_array_to_sorted`, `dynamic_array_to_spliced`, `dynamic_array_with`, `dynamic_array_flatmap`, `dynamic_array_hof`, `dynamic_array_hof_more`, `dynamic_array_reduce`, `dynamic_array_reduce_right`, `array_static_dynamic`, `dynamic_coercions`, `dynamic_object_entries`, `dynamic_object_from_entries`, `object_accessors`, `object_descriptors`, `object_extensibility`, `object_get_own_property_descriptors`, `object_has_own_property`, `object_is_prototype_of`, `object_property_is_enumerable`, `object_to_locale_string`, `object_to_string`, `object_value_of`, `object_is`, `object_prototypes`, `object_seal_freeze`, `object_static_methods`, `reflect_get_own_property_descriptor`.
  - Still missing: hidden classes / shape trees, inline caches and diagnostics, full accessor descriptor semantics (boxed function identity, closure-valued accessors, receiver-aware `this`), complete built-in object/array prototype behavior, broader prototype method coverage, and clean source split into `runtime/tsc_value.*` / `runtime/tsc_object.*`.
  - Still blocks: production-quality untyped npm packages, `Proxy`, full `Reflect`, full accessor descriptor semantics, and high-performance dynamic property access.

---

## 2. Medium-term phases (weeks each)

- **Phase 6 — `async`/`await` + libuv event loop** (~3 weeks)
  - State-machine lowering of each `async` function. `await` becomes a suspend/resume point that chains a `.then` onto the awaited promise.
  - `Promise` runtime with `resolve`/`reject`/`then`/`catch`/`finally`/`all`/`allSettled`/`race`/`any`.
  - Microtask queue + process.nextTick queue, drained in the right order each tick.
  - libuv (`libuv1-dev`) bound for `setTimeout`/`setInterval`/`setImmediate` and all future async I/O.
  - **Depends on Phase 3** for the `Promise<T>` value representation (mixed boxed + unboxed).

- **Phase 7 remainder — ES collections + language features** (~3 weeks)
  - Generators `function*` and `async function*` — state-machine lowering similar to async
  - `FinalizationRegistry`
  - Full iterator protocol coverage beyond arrays/strings/Map/Set, array-backed custom iterable classes, and class iterator objects with `next()` still remains for broader protocol edge cases

- **Phase 9 — `Proxy` + `Reflect`** (~2 weeks)
  - All 13 `Proxy` traps (`get`, `set`, `has`, `deleteProperty`, `apply`, `construct`, etc.)
  - `Reflect.*` API; dynamic `Reflect.get`/`Reflect.set`/`Reflect.has`/`Reflect.deleteProperty`/`Reflect.ownKeys`/`Reflect.defineProperty`/`Reflect.getPrototypeOf`/`Reflect.setPrototypeOf`/`Reflect.getOwnPropertyDescriptor`/`Reflect.isExtensible`/`Reflect.preventExtensions` are implemented
  - `Object.defineProperty` with full property descriptor semantics; dynamic data descriptors enforce `writable`/`configurable`/`enumerable`, and named-function accessors work, while closure-valued accessors/function identity/receiver-aware `this` remain
  - **Depends on Phase 3** heavily — proxies intercept dynamic property access.

---

## 3. Long-term phases (months)

- **Phases 11–13 — async Node stdlib** (~2 months total)
  - Phase 11: `fs.promises`, `events.EventEmitter`, `stream` (readable/writable/transform/pipe), `net`, `dns`
  - Phase 12: `http` / `https` (OpenSSL), `http2` (best-effort)
  - Phase 13: `child_process`, `cluster` (spawn model), `worker_threads` (pthread-backed, `structuredClone` for messages)

- **Phase 14 — npm integration** (~2 weeks *on top of* Phases 3 + 6 + 7)
  - Walk `node_modules/` and honor `package.json` `exports`/`imports`/`conditions`
  - Dual CJS/ESM resolution
  - `allowJs: true` so pure-JS packages are type-erased to `any` (needs Phase 3)
  - Native addon package detection for literal imports/requires now rejects installed package roots containing `build/Release/*.node`; broader package export/condition resolution remains

- **Phase 15 — perf & polish** (ongoing)
  - Inline-caching stats and diagnostics
  - Basic escape analysis to stack-allocate objects that don't outlive their frame
  - Dead-code elimination on the generated C
  - Further binary-size optimization and CI matrix (Linux ✓, macOS, Windows later)

---

## 4. Smaller missing pieces

Within-phase gaps that can be picked off individually without the big phase-level investments:

- Broader type guards / narrowing for deeper discriminated-union patterns. Basic user-defined type predicates over interface-shaped dynamic unions, basic literal-discriminant unions over interface-shaped dynamic objects, nullable pointer `typeof` guards such as `string | null` / `string | undefined`, and dynamic `string | number` `typeof` guards are implemented.
- More complex generic type relationships. Direct top-level generic function calls, typed array callback references, concrete generic function-value adapters, erased generic classes, and generic instance/static method calls with concrete `T` / `T[]` specializations are implemented.
- Decorators — requires metadata + Proxy support.

---

## 5. Permanent limits (will never be done)

These are genuinely impossible to AOT-compile at any engineering investment. The plan documents them, and `tsc2c` emits hard errors for the limits it can see before emission.

- **Native C++ addons under `node_modules/*/build/Release/*.node`.** They're compiled against Node's V8 ABI and the embedder's internals. We can't transpile their source because we don't have it — they're binary `.node` files. Literal `.node` import/require specifiers and literal package imports/requires whose installed package root contains `build/Release/*.node` are rejected now; broader package export/condition handling remains Phase 14. Suggested workaround is to document pure-JS alternatives.
- **Runtime code compilation** — JavaScript offers two constructs that require compiling source text at runtime. `tsc2c` is ahead-of-time and has no compiler in the produced binary, so `eval`, `Function(...)`, and `new Function(...)` are rejected before TypeScript diagnostics.
- **Dynamic `require(variable)`** where the argument isn't a string literal. The import graph is walked statically; a variable-valued specifier is unknowable at compile time, so non-literal `require(...)` is rejected before emission.

---

## How to pick

If the next session has **hours**, pick from section 4 (smaller pieces).

If it has **a few days to a week**, pick a bounded item from section 2, such as custom iterables, unless the session is large enough to start Phase 3.

If it has **a week or more** to invest in one thing, do **Phase 3 (NaN-boxing)** from section 1. That one item unblocks about half of what's in sections 2–4.

If the goal is **"run a real npm package"**, the sequential chain is: Phase 3 → Closures → Phase 6 → Phase 14. Expect roughly two months of focused work for that end-to-end.
