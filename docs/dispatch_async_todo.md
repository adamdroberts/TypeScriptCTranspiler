# TODO — `dispatch.async` / `dispatch.sync` explicit concurrency (GCD-style)

Status: **MVP implemented (2026-07-19).** Stages 1–4 below are landed except the items still
unchecked; `todo.md` carries the remaining work under "Dispatch concurrency (optional,
libdispatch-backed) — remainder". Capture safety now follows one canonical descriptor collection
whose value, decoded-root, and lexical-initialization snapshots are checked by a compact property
specification plus one distinct representative worklist stress. Existing dispatch E2E inventories
and concurrent runs are regression detectors, never cardinality evidence. Two implementation notes discovered en route:
libdispatch's Linux workqueue threads start with all signals blocked, so the task trampoline must
unblock Boehm's suspend/restart signals before `GC_register_my_thread`; and workers must
register/unregister per task (guarded against `dispatch_sync`'s run-inline-on-caller optimization)
because libdispatch destroys idle threads, which a stale GC registration turns into an abort.

## Summary

Add a GCD-inspired dispatch API to the tsc2c TypeScript dialect so programs can opt into real
multithreaded execution:

```ts
const q = new DispatchQueue("worker");            // serial queue
const bg = DispatchQueue.concurrent();            // shared concurrent pool

dispatch.async(q, () => { /* runs off-main */ }); // fire-and-forget → Promise<T>
dispatch.sync(q, () => { /* blocking handoff */ });
const r = await dispatch.async(bg, () => heavyCompute(input));
```

Backend: Apple's open-source **libdispatch** (`swift-corelibs-libdispatch`, Apache 2.0). The
plain-C `dispatch_async_f(queue, void* ctx, void (*fn)(void*))` API matches the runtime's existing
`{ void (*fn)(void*); void* env; }` callback shape (`tsc_promise_callback_t`,
`runtime/tsc_internal.h:164`) and the emitter's closure lowering (fn + heap env) with **zero
adaptation**, and it compiles/links with gcc — clang is only needed to build libdispatch itself.
Validated end-to-end on Linux (gcc → `dispatch_async_f` → Boehm `GC_register_my_thread` on
libdispatch-owned threads → GC-allocated memory surviving `GC_gcollect()` → serial-queue ordering
without locks).

Unlike the (rejected) idea of automatically parallelizing `async`/`await`, explicit dispatch
preserves JavaScript semantics for all existing code: parallelism only exists where the programmer
writes `dispatch.*`, and the compiler enforces what may cross the thread boundary.

---

## Hard requirement: strictly optional, zero cost when unused

This feature must never become a barrier to using tsc2c. Concretely:

- **No new mandatory dependency.** libdispatch is not packaged by current Debian/Ubuntu; it must be
  built from source (requires clang) or vendored. Therefore `-ldispatch` is linked **only when the
  compiled program actually uses the dispatch API**, following the existing precedents: libnode is
  linked only under `--unsafe-eval` (`tsc_node_embed.cc`), and `TSC2C_NO_GC=1` drops `-lgc`
  (`src/compile.ts:723-726`).
- **Usage-gated runtime compilation.** Dispatch support lives in a new `runtime/tsc_dispatch.c`
  that is appended to `RUNTIME_SOURCES` (`src/compile.ts:68-77`) only when the emitter records a
  dispatch-API use in the program. Programs that never mention `dispatch` produce byte-identical
  builds to today.
- **Zero-cost thread-safety baseline when off.** The runtime thread-safety work (below) is guarded
  by a `TSC_THREADS` compile-time define, set only for dispatch-using programs. When unset, the
  guard macros (`TSC_ATOMIC_INC`, `TSC_SHAPE_LOCK`, …) expand to today's plain unsynchronized
  operations, and exception-state globals remain plain statics. Single-threaded programs pay
  nothing — not even an uncontended lock.
- **Clear failure when unavailable.** If a program uses dispatch and libdispatch cannot be found
  (header/lib probe in `src/compile.ts`, overridable via `TSC2C_LIBDISPATCH_PREFIX`), compilation
  fails with an actionable diagnostic (what to install/build, or how to enable the fallback) —
  never a cryptic linker error.
- **Serial fallback mode.** `--dispatch=serial` compiles dispatch calls to run their closures on
  the existing single-threaded event loop (dispatch.async → `tsc_set_immediate`, dispatch.after →
  `tsc_set_timeout`, dispatch.sync → direct call). No parallelism, but programs remain runnable and
  testable on machines without libdispatch — and it provides a semantics baseline to diff the
  threaded mode against. Tests: `dispatch_serial`, `dispatch_serial_after`, `dispatch_serial_group_barrier`.
- **`--no-gc` interaction.** The `TSC_NO_GC` bump-arena allocator (`runtime/tsc_core.c:100-117`)
  is mutex-protected under `TSC_THREADS`, so threaded dispatch may be combined with `--no-gc`.
- **Existing tests untouched.** All current e2e cases (1,620) must pass unchanged with no
  libdispatch installed. Dispatch e2e cases carry a `compile.dispatch` sidecar (precedent:
  `compile.unsafe_eval`) and are skipped by `tests/e2e/run.ts` when the probe fails.

---

## Language-coverage check (against `todo.md` as of 2026-07-19)

What the dispatch feature needs from the language, versus what exists:

| Needed | Status |
|---|---|
| Closures with static capture analysis | ✅ `collectClosureCaptures` / heap env structs (`src/emit/index.ts:21734`, `:38024`) |
| `structuredClone` for cross-thread copies | ✅ `runtime/tsc_value.c:4219` |
| Promise + microtask scheduling | ✅ `runtime/tsc_promise.c`, microtask queue in `tsc_core.c` |
| Class/object model, typed captures | ✅ |
| **General `await` state-machine lowering** | ❌ **Phase 6 "next-up unblocker" (`todo.md:13-14`)** — current lowering is a bounded recognizer cascade; an unrecognized `await` on a *pending* promise emits a never-resolving bail (`src/emit/index.ts:34467`) |

**Verdict: coverage is sufficient for an MVP, but not for the full feature — and the gap is
already the roadmap's #1 item.**

- An MVP is possible **today** because dispatched closures are *synchronous* TS functions (like GCD
  blocks — no `await` inside them, enforced by a diagnostic), and `dispatch.async` returning a
  `Promise<T>` settled on the main loop fits the existing recognizer patterns for the common
  `const r = await dispatch.async(...)` shape.
- However, real parallelism makes **pending promises the common case** rather than the edge case,
  so the recognizer cascade's silent never-resolving fallback goes from rare hazard to routine
  footgun. Shipping dispatch before general suspension lowering would make that existing gap much
  more visible.

**Best insertion point:** immediately **after the Phase 6 general state-machine lowering** lands
(or overlapping its tail), and **before/alongside the Phase 11 "true libuv-backed async I/O"**
item — because both need the same runtime groundwork (thread-registered GC, wake-able event loop,
locked completion queue). Build that baseline once, under this feature's flag, and Phase 11 can
reuse it (libdispatch's epoll-backed dispatch sources are even a candidate libuv alternative for
Phase 11, and Phase 13's `worker_threads` can reuse the queue/trampoline machinery). Suggested
`todo.md` placement when adopted: a new optional entry in section 2 ("Dependent phases") depending
on Phase 6, cross-referenced from Phases 11/13.

---

## Work items

### Stage 0 — prerequisite (already tracked in `todo.md`)

- [ ] Phase 6 general multi-suspension `await` state-machine lowering (`todo.md:13-14`). Not owned
  by this feature; listed as the gate. Minimum bar for dispatch MVP: awaiting a
  `dispatch.async(...)` result in the recognized single-await shapes; full bar: arbitrary `await`
  placement so pending-by-default promises are safe everywhere.

### Stage 1 — runtime thread-safety baseline (all under `TSC_THREADS`, no-op otherwise)

- [x] Boehm GC threaded mode: define `GC_THREADS` before `gc/gc.h`, call
  `GC_allow_register_threads()` in `tsc_bootstrap` (`runtime/tsc_core.c:460` area).
- [x] Exception state → thread-local: `g_try_top`, `g_current_error`
  (`runtime/tsc_core.c:120-121`) become `_Thread_local` (setjmp frames are per-stack already).
- [x] Shape tree: mutex on transition/creation paths (rare after warmup), release-store publication
  for lock-free read walks; atomic `g_shape_id_counter`, `g_object_id_counter`
  (`runtime/tsc_object.c:3-49`).
- [x] Symbol registry + `tsc_next_symbol_id` (`runtime/tsc_builtin.c:11-22`): lock + atomic.
- [x] Lazy singleton prototype caches (`tsc_object.c:140`, `tsc_value.c:1380-1400,4436`,
  `tsc_array.c:5-23`): once-guards (`pthread_once` or double-checked with atomics) behind a
  `TSC_LAZY_INIT` macro.
- [x] Lazy string-hash write-back (`runtime/tsc_internal.h:340-347`): make the store atomic-relaxed
  under `TSC_THREADS` (idempotent value, so relaxed suffices).
- [x] Wake-able event loop: replace the `nanosleep` idle wait (`tsc_core.c:1179-1200`) with
  condvar/eventfd wait; add one mutex-protected cross-thread completion queue that the loop drains
  like immediates. **Shared with Phase 11 async I/O — design once.**
- [ ] Audit remaining file-scope globals in `runtime/` for cross-thread reachability from
  dispatched code (event-emitter defaults, diagnostics counters, `srand` usage).

### Stage 2 — dispatch runtime (`runtime/tsc_dispatch.c`, compiled only when used)

- [x] Queue objects: wrap `dispatch_queue_t` in a `tsc_value_t`-boxable handle; serial + concurrent
  constructors; global concurrent pool accessor.
- [x] Task trampoline: unconditional `GC_register_my_thread()` treating `GC_DUPLICATE` as the fast
  path (register-once-per-thread; never unregister per task), then invoke the emitted closure
  (fn + env), catch via a fresh thread-local try frame, capture result/error.
- [x] Result delivery: settle the returned promise by posting to the caller's completion queue —
  **promises gain a home queue**; `.then` callbacks always run on the promise's home loop.
  MVP: home queue is always the main loop.
- [x] `dispatch.sync`: blocking handoff via `dispatch_sync_f`; detect same-queue self-deadlock
  (queue-specific key) and throw instead of hanging.
- [x] Main-loop bridge: main thread keeps `tsc_run_event_loop` (no `dispatch_main()`); program
  exit waits for outstanding dispatch groups like it waits for timers.
- [x] Stretch: `dispatch.after(ms, q, fn)`; dispatch groups surfaced as `Promise.all`-style joins,
  barriers on concurrent queues.

### Stage 3 — compiler surface

- [x] `stdlib/lib.core.d.ts`: declare `DispatchQueue`, `dispatch.async` / `sync` (+ stretch APIs).
  Types only — programs remain valid vanilla TypeScript.
- [x] Emitter recognition of `dispatch.*` calls (same pattern-match style as the existing stdlib
  surface), reusing the existing closure-lowering output for the task fn/env.
- [x] **Capture discipline (the safety core):** at each `dispatch.async`/`sync` boundary, validate
  one `collectClosureCaptures` descriptor collection plus checker types. Every descriptor receives
  fresh value storage: primitives and queues are copied directly, const array/dynamic values pass
  through `structuredClone` with a fresh decoded-root slot, and every lexical descriptor receives
  a copied runtime initialized bit.
  Module bindings reuse the canonical Module Environment state, while TypeScript/non-Module
  top-level bindings are induced by one source-statement worklist. An uninitialized capture is
  represented without reading its value and later fails through the normal TDZ boundary. `await`
  inside a dispatched closure is a compile error (MVP). Later: `Shared<T>` locked-accessor escape
  hatch; queue-confinement ("actor") typing.
  Top-level helper functions referenced by a task are recursively audited so transitive mutable or
  non-primitive global access is rejected. Test: `dispatch_capture_transitive_diagnostic`.
- [x] Usage flag → `src/compile.ts`: append `tsc_dispatch.c`, define `TSC_THREADS`, probe and link
  `-ldispatch` (+ rpath), emit the actionable not-found diagnostic; `--dispatch=serial` fallback
  flag.

### Stage 4 — tests & CI

- [x] e2e cases under `tests/e2e/cases/dispatch_*` with `compile.dispatch` sidecar; make outputs
  deterministic via groups/`dispatch.sync` joins and order-independent assertions; runner skips
  when libdispatch probe fails.
- [x] Capture-discipline diagnostics tests (compile-error cases).
- [x] Independent capture property across scope/storage/mutation/TDZ partitions in both memory
  modes, plus `dispatch_capture_worklist` as one separate representative descriptor-worklist
  stress. Neither its width nor aggregate fixture passes are used as a support denominator.
- [x] Serial-fallback differential tests: `dispatch_serial` exercises the same sync/async program
  shape as `dispatch_async_basic`, `dispatch_serial_after` mirrors `dispatch_after`, and
  `dispatch_serial_group_barrier` covers group/barrier scheduling; all produce identical output
  without libdispatch.
- [ ] Soak test (manual-tests/): sustained many-thread GC allocation + forced collections;
  documented TSan configuration (known friction: TSan vs Boehm stop-the-world signals — may need
  a TSan job with GC swapped for `--no-gc`-style malloc or GC suppressions).
- [ ] CI: one additional matrix job that builds/caches libdispatch from source (clang) and runs
  the dispatch cases; all other jobs unchanged and libdispatch-free, proving optionality.

---

## Non-goals

- Automatic parallelization of `async`/`await` — rejected; breaks JS run-to-completion semantics
  and requires infeasible escape analysis.
- GCD's "capture anything, you're responsible" default — the emitter can check; it should.
- Making libdispatch a hard dependency, vendoring it (~100k LOC), or requiring clang for tsc2c
  users. If source-build friction proves too high for adopters, fall back to an internal ~1k-line
  pthread queue pool implementing the same recognized API (design decision deferred until after
  the MVP; the compiler surface is identical either way).
