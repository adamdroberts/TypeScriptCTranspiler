# Architecture

How `tsc2c` turns a TypeScript source tree into a native gcc-linked binary.

## Top-level pipeline

```mermaid
flowchart LR
    A[entry.ts]
    A --> B[ts.createProgram<br/>official TS API]
    B --> C[TypeChecker]
    B --> D[Module graph walker<br/>src/resolve.ts]
    C --> E
    D --> E[Emitter<br/>src/emit/index.ts]
    E --> F[build/main.c<br/>single C file]
    F --> G[gcc -O2 main.c tsc_runtime.c -lgc -lm<br/>or -Os -s with --release]
    G --> H[native binary]
```

Every step maps to a file under `src/`:

| Stage | File | Responsibility |
|-------|------|---------------|
| Parse + type-check | `src/program.ts` | wraps `ts.createProgram` with our compiler options and `stdlib/lib.core.d.ts` as the ambient lib |
| Module graph | `src/resolve.ts` | walks `ts.Program.getSourceFiles()`, resolves imports via `ts.resolveModuleName`, topologically sorts |
| Emit | `src/emit/index.ts` | AST → C via the `Emitter` class |
| Link | `src/link/cc.ts` | spawns gcc with the right flags |
| Orchestrate | `src/compile.ts` | drives all of the above |
| CLI | `src/cli.ts` | commander-based argv parser |

## Emission: six passes per module

Inside `Emitter.emitModule()`, each source file goes through passes. The multi-pass structure lets cyclic declarations resolve (e.g. a class's method can reference another class declared later in the file, or even in a later module).

```mermaid
flowchart TD
    M[sf.statements] --> A[Pass A: struct fwd-decls<br/>typedef struct Foo_t Foo_t;]
    A --> B[Pass B: struct bodies<br/>struct Foo_t { ... };]
    B --> C[Pass C: function + method prototypes<br/>also lifted-arrow protos]
    C --> D[Pass D: function + method bodies<br/>also lifted-arrow bodies]
    D --> E[Pass E: top-level statements<br/>split into file-scope decls<br/>+ mod_init_mX assignments]
```

Pass A and B handle **both** class declarations and interface declarations — interfaces become C structs with fields, no methods. The emission is ordered A..E so every name is declared by the time it's used.

Pass E is the only place where module-scope `const`/`let` are special-cased: they're split into a file-scope declaration (`static T name;`) and an assignment inside `mod_init_mX()`. This promotion is what makes top-level names visible to functions + lifted arrows.

## Module graph + init ordering

```mermaid
flowchart LR
    E[entry.ts<br/>m_in]
    U[src/utils.ts<br/>m_utils]
    M[src/math.ts<br/>m_math]
    E -- import --> U
    E -- import --> M
    U -- import --> M
```

Topo-sorted: `[m_math, m_utils, m_in]` (leaves first).

The final `main.c` calls mod_inits in that order, then returns:

```c
int main(int argc, char** argv) {
    tsc_bootstrap(argc, argv);
    mod_init_m_math();    // deps first
    mod_init_m_utils();
    mod_init_m_in();      // entry module last
    return 0;
}
```

Every runtime-reachable module's top-level statements execute inside its `mod_init`. Type-only import/export edges still let declarations from the referenced source file contribute C types and prototypes, but `main()` does not call that module's `mod_init`, so `import type` does not trigger runtime side effects. A narrow CommonJS package-source subset treats top-level `exports.name = ...`, `module.exports.name = ...`, chained `exports.name = module.exports.name = ...`, chained `module.exports.name = exports.name = ...`, `exports.name = void 0` / `module.exports.name = void 0` placeholder elision, `exports.default = ...`, `Object.defineProperty(exports, "default", { value })` default interop, `Object.defineProperty(exports, "name", { value })` / `Object.defineProperty(module.exports, "name", { value })` data exports, top-level `Object.defineProperties(exports, { name: descriptor })` descriptor-map exports, top-level `Object.assign(exports, { name: value })` / `Object.assign(module.exports, { name: value })` data/default export mutation, top-level `Object.assign(exports, require("./local.js"))` / `Object.assign(module.exports, require("./local.js"))` package-local re-export mutation, simple zero-arg `Object.defineProperty(..., { get() { return value; } })` getter exports, string-literal and statically computed `exports["name"] = ...` / `module.exports["name"] = ...`, object-literal identifier/function-valued/arrow-function-valued/method/primitive-literal exports, function-valued / arrow-function-valued / identifier-valued / primitive-literal / array-valued / static object-or-array-literal and supported runtime-computed dynamic-object `module.exports = ...` defaults via `Object.assign`/`Object.create`/`Object.defineProperty`/`Object.defineProperties`/`Object.fromEntries`/`Object.setPrototypeOf`/`Object.preventExtensions`/`Object.seal`/`Object.freeze`, including object-spread defaults over dynamic object values, top-level literal `const pkg = require("pkg")` member reads/calls, top-level literal `require("pkg").name` member reads/calls, top-level literal `require("pkg")` reads for module-exported default values, top-level literal `require("pkg")(...)` calls for function-valued module exports, top-level literal `const { name, alias: local } = require("pkg")` bindings, top-level literal `const fn = require("pkg")` calls for function-valued module exports, package-local top-level literal `require("./local.js")` member/default/direct-default/member-default re-exports, top-level and package-local literal `module.require(...)` member reads/calls/re-exports, side-effect-only top-level `require("pkg")`, transpiled-ESM `Object.defineProperty(exports, "__esModule", ...)` and `exports.__esModule = true` marker elision, `__filename` / `__dirname` reads, and read-only `module.filename` / `module.id` / `module.path` / `module.loaded` metadata as exported module bindings/init edges instead of modeling the full CommonJS `exports` object and wrapper.

Static literal `require(...)` calls are collected throughout a source file, including function bodies, so function-scoped bindings can resolve to package-source exports. Dependencies still execute eagerly through `mod_init`; this is not Node's lazy require timing.

For the current package-source subset, untyped JavaScript object and array literals lower to `tsc_value_t` dynamic objects/arrays in local declarations, default-exported object literals, and named/default/namespace imports, which keeps common JS package initialization patterns compatible with dynamic `Object.assign(...)`, `Object.defineProperty(...)`, and `Object.fromEntries(...)` paths.

Cycles: the DFS in `src/resolve.ts` stops at the back edge, then continues — producing a best-effort topological order. Circular imports are compiled but not runtime-reordered; if module A's init reads from module B's uninitialized globals, the reader sees the zero value (since all file-scope statics are zero-initialized by the C ABI).

## Multi-file output model

```mermaid
flowchart LR
    SRC[entry.ts + utils.ts + math.ts]
    OUT[build/main.c<br/>single file<br/>all modules merged<br/>flat namespace]
    RT[build/tsc_runtime.c<br/>hand-written runtime]
    H[build/tsc_runtime.h]
    SRC --> OUT
    OUT -- includes --> H
    RT -- includes --> H
    OUT --> CC[gcc]
    RT --> CC
    CC --> BIN[binary]
```

Every user-defined module merges into one `main.c`. This keeps the flat symbol namespace viable at link time. A future session can switch to per-module `.c`/`.h` files once symbol prefixing is in, but flat-namespace was enough for the current 24-test suite.

## Value representation (typed path)

Today's emitter prefers specialized C types for each TS type and uses a NaN-boxed dynamic value only for `any` / `unknown` / heterogeneous unions. The `CType` model (in `src/emit/types.ts`) decides the C spelling based on TypeScript's inferred or annotated type:

| TS type | C type | Notes |
|---------|--------|-------|
| `number` | `double` | IEEE 754; int optimization deferred |
| `symbol` | `tsc_symbol_t*` | unique symbol identity plus global registry |
| `string` | `tsc_str_t*` | immutable UTF-8, GC'd |
| `boolean` | `bool` | `<stdbool.h>` |
| `any` / `unknown` | `tsc_value_t` | NaN-boxed dynamic value for numbers, strings, booleans, null/undefined, arrays, and dynamic objects |
| `void` / `null` / `undefined` | `void` / NULL sentinel | for pointer types |
| `T[]` / `Array<T>` | `tsc_array_t*` | dynamic array, element type known at emit |
| `Map<K, V>` | `tsc_map_t*` | type-erased runtime; key kind tag chooses compare fn |
| `Set<T>` | `tsc_set_t*` | same |
| `WeakMap<K, V>` | `tsc_map_t*` | pointer-key map without iteration API |
| `WeakSet<T>` | `tsc_set_t*` | pointer-key set without iteration API |
| `WeakRef<T>` | `tsc_weakref_t*` | typed target pointer wrapper |
| `RegExp` | `tsc_regexp_t*` | PCRE2 regex behind the wrapper |
| `(args) => ret` | `tsc_fn_*_t*` | typed closure value with generated `{fn, env}` struct; function-scope captures use GC-managed ref cells |
| `class Foo` | `Foo_t*` | struct with inherited fields laid at prefix |
| `interface Foo` | `Foo_t*` | same (struct of fields, no methods) |

When two CTypes disagree (e.g. assigning `null` to a `string` field), `Emitter.coerce()` inserts the bridge. Valid coercions today:

- `void` → any pointer kind = typed `NULL` cast
- any value → `string` = `tsc_str_from_num/bool/lit` helper
- same-kind classes with different names (up-cast) = C cast

Cross-type arithmetic / equality is rejected by the emitter with a `Cannot coerce` diagnostic.

## Dynamic value path

Phase 3 now has its foundation: `any` / `unknown` and heterogeneous unions use NaN-boxed `tsc_value_t`. The plan in `~/.claude/plans/make-a-typescript-to-floating-comet.md` still covers the remaining high-performance object work; summary:

```mermaid
flowchart TD
    AST[TS AST node]
    AST --> TC{checker.getTypeAtLocation<br/>specialized?}
    TC -- yes --> S[Specialized path<br/>double / tsc_str_t* / ...]
    TC -- no<br/>any/unknown --> D[Boxed path<br/>tsc_value_t<br/>NaN-tagged uint64_t]
    S <--> B[Bridge:<br/>box/unbox at boundaries]
    D <--> B
```

The current bridge boxes specialized primitives/arrays into `tsc_value_t` and supports dynamic JSON/object/array access, dynamic arithmetic/equality/relational/logical/nullish operators, common string/array method dispatch, and unboxing into typed destinations. Remaining Phase 3 work includes hidden classes / shape trees, inline caches, broader prototype method coverage, and descriptor-aware property semantics. See [`todo.md`](todo.md#1-next-up-unblockers) for impact and effort.

## Runtime layer

`runtime/tsc_runtime.h` + `runtime/tsc_runtime.c` are the C runtime. Every produced binary includes these. Grouped by feature area:

```mermaid
flowchart TD
    RT[tsc_runtime]
    RT --> GC[GC wrapper<br/>Boehm or malloc fallback]
    RT --> STR[Strings<br/>tsc_str_*]
    RT --> ARR[Arrays<br/>tsc_array_*]
    RT --> MS[Map / Set<br/>tsc_map_* / tsc_set_*]
    RT --> REG[RegExp<br/>PCRE2 regex wrapper]
    RT --> EX[Exceptions<br/>setjmp/longjmp]
    RT --> NUM[Numbers<br/>parseFloat/Int, num_mod, math_random]
    RT --> JSON[JSON helpers<br/>escape_string, num]
    RT --> NODE[Node stdlib<br/>fs / path / os / process / console]
```

Symbol-level reference: [`runtime-reference.md`](runtime-reference.md).

## Memory model

- Boehm GC (`libgc-dev`) by default. All user-visible allocations go through `TSC_GC_MALLOC` (tracked) or `TSC_GC_MALLOC_ATOMIC` (raw bytes, no scan).
- Fallback: `--no-gc` compile flag swaps the macros for `calloc`. The binary leaks everything but runs — useful in environments without libgc.
- Exception path: `setjmp`/`longjmp` with a single global error string (`g_current_error`). No stack traces yet.
- Classes and interfaces are heap-allocated; there's no value type for them.
- Strings are immutable — every mutation returns a fresh allocation.

## Diagnostics flow

```mermaid
flowchart LR
    SRC[user.ts]
    SRC --> TS[TS type check]
    TS -->|TS error| TSE[exit 2<br/>TS diag with code frame]
    TS -->|ok| EM[Emitter]
    EM -->|unsupported node| UE[exit 3<br/>file:line:col: unsupported: ...]
    EM -->|ok| CC[gcc]
    CC -->|C error| CCE[exit 1<br/>gcc output]
    CC -->|ok| BIN[binary]
```

Three distinct exit codes let callers (tests, CI, other tools) tell categories of failure apart.

## Files-to-know list

For readers planning to modify the emitter:

- `src/emit/index.ts` — the whole `Emitter` class. One method per AST node kind.
- `src/emit/types.ts` — CType and `mapTsType` (the single source of truth for TS → C type mapping).
- `src/emit/cbuf.ts` — indent-tracked C source writer, raw preprocessor lines for `#line`, and string escape helpers.
- `src/emit/mangle.ts` — C keyword collision avoidance.
- `src/resolve.ts` — the module graph.
- `src/compile.ts` — the glue; typically read first for orientation.
- `runtime/tsc_runtime.h` — the authoritative list of runtime capabilities.
- `stdlib/lib.core.d.ts` — the authoritative list of what TS the checker will accept.
