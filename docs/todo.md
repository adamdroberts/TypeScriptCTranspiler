# TODO — remaining work

Scope of the full project (from the approved plan): **full ECMAScript 2026 + transpile arbitrary `node_modules`**. At the current pace, what's done is roughly 55–65% of the 15-phase plan. The rest is measured in weeks and months, not hours.

Items are grouped by how soon they unblock the most user value. Within each group the ordering reflects dependency + estimated effort.

---

## 1. Next-up unblockers

These are the two items that most directly expand what programs can be written against `tsc2c`. Either is a reasonable starting point for the next session.

- **Closures with non-module captures** (~1–2 weeks)
  - What: arrow functions or function expressions that capture variables from an enclosing *function* scope (not just module scope).
  - Why blocked: requires allocating an environment struct per arrow, boxing captured mutable locals in ref cells, and generating a `{fn_ptr, env_ptr}` closure value per unique signature.
  - Today: inline arrows in HOFs work (C lexical scope picks up enclosing locals), and top-level arrow consts work (module-level vars are file-scope). Neither of those helps `function outer() { const x = 5; return (y) => x + y; }`.
  - Unblocks: callback-returning factories, partial application, any deeply functional style.

- **NaN-boxed dynamic value runtime — Phase 3** (~2–3 weeks)
  - What: a `tsc_value_t` type (NaN-boxed `uint64_t`) that can hold any JS value — number, string pointer, object pointer, bool, null, undefined — uniformly.
  - Why deferred: hidden-classes / shape trees + inline caches are a significant project.
  - Unblocks simultaneously: `any` / `unknown` types at runtime, `JSON.parse` returning a dynamic object, `Object.values` with mixed-type fields, heterogeneous arrays, `Proxy`/`Reflect` (depends on dynamic property access), and **the vast majority of untyped npm packages**.
  - Critical files (planned): `runtime/tsc_value.h` (NaN-box helpers), `runtime/tsc_object.c` (shapes + IC), new boxed/unboxed bridging in `src/emit/index.ts`.

---

## 2. Medium-term phases (weeks each)

- **Phase 6 — `async`/`await` + libuv event loop** (~3 weeks)
  - State-machine lowering of each `async` function. `await` becomes a suspend/resume point that chains a `.then` onto the awaited promise.
  - `Promise` runtime with `resolve`/`reject`/`then`/`catch`/`finally`/`all`/`allSettled`/`race`/`any`.
  - Microtask queue + process.nextTick queue, drained in the right order each tick.
  - libuv (`libuv1-dev`) bound for `setTimeout`/`setInterval`/`setImmediate` and all future async I/O.
  - **Depends on Phase 3** for the `Promise<T>` value representation (mixed boxed + unboxed).

- **Phase 7 remainder — ES collections + language features** (~3 weeks)
  - `Symbol`, well-known symbols (`Symbol.iterator`, `Symbol.asyncIterator`)
  - Generators `function*` and `async function*` — state-machine lowering similar to async
  - `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`
  - Iterator protocol for built-in collections — `for...of` on `Map`/`Set` natively (currently only via `.forEach`)
  - Spread/rest in function calls and parameters (`f(...args)`, `function f(...rest)`)
  - Computed property names `{ [k]: v }`
  - Tagged template literals

- **Phase 8 remainder — BigInt + full regex** (~1 week)
  - `BigInt` backed by GMP (`libgmp-dev`). `0n` literals, arbitrary-precision arithmetic.
  - PCRE2 (`libpcre2-dev`) swap-in to replace POSIX ERE — gives lookahead/lookbehind, named capture groups, Unicode property escapes.
  - Regex capture groups exposed on `.match()` results (today only `match[0]` is returned).

- **Phase 9 — `Proxy` + `Reflect`** (~2 weeks)
  - All 13 `Proxy` traps (`get`, `set`, `has`, `deleteProperty`, `apply`, `construct`, etc.)
  - `Reflect.*` API
  - `Object.defineProperty` with full property descriptor semantics (writable/configurable/enumerable, getters/setters)
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
  - Detect `*.node` native addons at resolve time and emit a hard error with remediation guidance

- **Phase 15 — perf & polish** (ongoing)
  - Inline-caching stats and diagnostics
  - Basic escape analysis to stack-allocate objects that don't outlive their frame
  - Dead-code elimination on the generated C
  - `#line` directives from TS into the `.c` output so gdb stops at TS source
  - Binary-size optimization, release build, CI matrix (Linux ✓, macOS, Windows later)

---

## 4. Smaller missing pieces

Within-phase gaps that can be picked off individually without the big phase-level investments:

- `Array.prototype.sort` with **no comparator** — currently requires an explicit `(a, b) => …`. JS default is string-conversion sort; we'd need to add that as a fallback path. (A few hours.)
- `Array.prototype.flat(depth?)` and `.flatMap(cb)`. (A few hours.)
- `Object.entries(obj)`, `Object.fromEntries(entries)`. (Needs either Phase 3 tuples or a specialized `[K, V]` 2-element struct per call site.)
- `String.prototype.matchAll(re)` returning an iterator of full match groups.
- `String.prototype.normalize()`, `.codePointAt()`, `.fromCharCode()` — Unicode-aware string ops.
- **Left-to-right argument evaluation** for function calls with side effects. C's argument order is unspecified, so `f(bump(), bump(), bump())` can reorder. Fix: hoist args with side effects into sequenced temps before the call.
- **Regex capture groups** on the results of `.match()` (today only `match[0]` is exposed — we ignore `regmatch_t` slots beyond 0).
- `for...of` directly on `Map` and `Set` — currently works via `.forEach()` but not via native iteration syntax.
- `JSON.parse(text)` — returns a structured value, blocked on Phase 3 dynamic runtime.
- `Buffer` — currently conflated with `string` in the type shim; real `Uint8Array`-like semantics with binary safety is a modest amount of runtime work.
- `URL` parsing class — a focused effort using a URL library or hand-rolled parser.
- `crypto.createHash('sha256').update(...).digest('hex')` — straightforward once linked against OpenSSL.
- `console.log` formatting specifiers (`%s`, `%d`, `%o`, etc.) — ignored today, each arg just stringified + space-joined.
- `instanceof` operator — needs a class-hierarchy check, trivial for our single-inheritance model.
- `typeof` operator — trivial in typed code (compile-time result), more interesting for `any` values (Phase 3).
- Exhaustiveness checking in `switch` — TS already does this; we just surface its errors today.
- `enum` declarations — parsed by TS but we don't emit them yet. Numeric enums would be straightforward.
- `abstract` classes, access modifiers (`public`/`private`/`protected`) — TS-only; no runtime effect, we currently accept but ignore.
- `readonly` on fields — TS-only; same treatment.
- Type guards / narrowing beyond `T | null`/`undefined` — partial support; `typeof x === "string"` isn't tracked.
- Generic functions that aren't type-erased cleanly — e.g. `function identity<T>(x: T): T` works only when `T` binds to a single concrete type at each call site.
- Namespace declarations — TS namespace syntax not handled.
- Decorators — requires metadata + Proxy support.
- **Tail-call optimization** — not emitted. Deep recursion hits C stack.

---

## 5. Permanent limits (will never be done)

These are genuinely impossible to AOT-compile at any engineering investment. The plan documents them, the emitter will eventually detect + hard-error on them (today it just fails at link or parse time).

- **Native C++ addons under `node_modules/*/build/Release/*.node`.** They're compiled against Node's V8 ABI and the embedder's internals. We can't transpile their source because we don't have it — they're binary `.node` files. Detection + error is planned for Phase 14; suggested workaround is to document pure-JS alternatives.
- **Runtime code compilation** — JavaScript offers two constructs that require compiling source text at runtime. `tsc2c` is ahead-of-time and has no compiler in the produced binary, so any call to either form is rejected. Diagnostic planned in Phase 3 or Phase 14.
- **Dynamic `require(variable)`** where the argument isn't a string literal. The import graph is walked statically; a variable-valued specifier is unknowable at compile time. `require("./literal")` and `await import("./literal")` are supported; `require(someExpr)` is rejected.

---

## How to pick

If the next session has **hours**, pick from section 4 (smaller pieces).

If it has **a few days to a week**, pick from section 2 (medium-term phases — start with Phase 8 remainder since PCRE2 is mostly drop-in).

If it has **a week or more** to invest in one thing, do **Phase 3 (NaN-boxing)** from section 1. That one item unblocks about half of what's in sections 2–4.

If the goal is **"run a real npm package"**, the sequential chain is: Phase 3 → Closures → Phase 6 → Phase 14. Expect roughly two months of focused work for that end-to-end.
