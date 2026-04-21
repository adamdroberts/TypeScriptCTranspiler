# TypeScriptC

A whole-program TypeScript-to-C transpiler that produces native Linux binaries.

Goal: take a Node.js-style TypeScript app and get back a standalone executable that behaves like `node app.ts` — without Node at runtime. It uses the **official TypeScript Compiler API** for parsing and type-checking, generates C11, and invokes **gcc** to produce the binary. Memory is managed by **Boehm GC** (`libgc`).

## Status

Substantial working subset, verified by **24 passing end-to-end tests** including a real word-count CLI that tokenizes via regex, counts via `Map`, sorts by a user comparator, and reads `process.env`. ~5,800 LOC across TypeScript compiler + C runtime + type shims.

**Phases complete:**

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Bootstrap (gcc driver, build dir, CLI, `--no-gc` fallback) | ✅ |
| 1 | Typed core — primitives, operators, control flow, functions, `switch`, nullish coalescing `??`, optional chaining `?.` | ✅ |
| 2a | Typed arrays — literal (with spread `[...a, b]`), indexing, `.length`, push/pop/shift/unshift, `for-of`, reverse, **sort (user comparator)**, slice, concat, join, indexOf, includes | ✅ |
| 2b | Classes — fields, ctor, methods, `new`, `this`, `extends`, `super()`, static fields + methods | ✅ |
| 2c | Higher-order array methods (`forEach`/`map`/`filter`/`reduce`/`find`/`findIndex`/`some`/`every`) with **inline arrows OR named function references** | ✅ |
| 2d | Top-level `const f = (...) => ...` lifts to a static C function — usable as a call target AND as an HOF callback | ✅ |
| 2.5 | Interfaces + object literals with typed shape; `Object.keys`/`values` | ✅ |
| 4 | Multi-file module graph — flat namespace, local imports, topological init | ✅ |
| 5 | Exceptions — `throw` / `try` / `catch` / `finally` via setjmp/longjmp | ✅ |
| 7 (partial) | `Map<K,V>` + `Set<T>` with linear scan (get/set/has/delete/clear/keys/values/size) | ✅ |
| 7 (partial) | JSON.stringify (type-driven, recursive for arrays and objects) | ✅ |
| 8 (partial) | **RegExp via POSIX ERE** (`/pattern/flags`, `re.test`, `s.replace`, `s.match`, `s.split` with JS escape translation: `\d` `\D` `\w` `\W` `\s` `\S`) | ✅ |
| 10 | Sync Node stdlib — `fs` (read/write/exists/readdir), `path`, `Math`, `os`, `Date.now`, `Number.*` statics, `Array.isArray`/`Array.from`, **`process.env`**, **`process.cwd()`**, **`process.argv`** | ✅ |
| 2d+ | **Module-level captures** — top-level `const/let` are emitted as file-scope statics, so top-level functions AND lifted arrow consts can read/write them as ordinary globals | ✅ |

**Not implemented in this session (deferred):**

- **Phase 3** — NaN-boxed dynamic value runtime. Needed for `any`/`unknown`, untyped npm packages, `JSON.parse` into dynamic objects. ~2–3 weeks of focused work.
- **Phase 6** — `async/await` + libuv event loop + Promise + microtask queue. ~3 weeks.
- **Phase 7 remainder** — `Symbol`, generators, `Proxy`, `Reflect`, `WeakMap`, `WeakSet`.
- **Phase 8 remainder** — BigInt (GMP-backed). Regex is in (POSIX ERE); lookahead/behind + named groups would need PCRE2.
- **Phases 11–13** — Async Node stdlib (streams, http, net, child_process, worker_threads).
- **Phase 14** — `node_modules` transpilation (requires Phases 3, 6, 7 first).
- Full closures over arbitrary captured variables — needs env-struct allocation per arrow. Non-capturing top-level arrows work; inline-arrow HOF callbacks work (via C lexical scope).

See `~/.claude/plans/make-a-typescript-to-floating-comet.md` for the full 15-phase plan.

## Quick start

```bash
# one-time: install Boehm GC for real binaries.
# without it, pass --no-gc and the binary will leak (fine for short programs).
sudo apt-get install -y libgc-dev

bun install

./bin/tsc2c tests/e2e/cases/hello/in.ts -o /tmp/hello && /tmp/hello
./bin/tsc2c tests/e2e/cases/fizzbuzz/in.ts -o /tmp/fb && /tmp/fb
```

`bin/tsc2c` prefers `bun` (runs TS directly); falls back to `node dist/cli.js` if you've run `bun run build`.

## CLI

```
tsc2c <entry.ts> [options]

  -o, --output <path>       output binary path (default: a.out)
  --emit-c-only             write generated C to the build dir, skip gcc
  --keep-build-dir <path>   reuse an explicit build dir (default: tempdir)
  --no-gc                   link without libgc (leaking malloc fallback)
  --verbose                 print compile steps + gcc command
```

## Feature tour

Each of the following compiles and runs end-to-end. See `tests/e2e/cases/` for full examples.

### Classes with inheritance + static

```ts
class Animal {
    name: string;
    constructor(name: string) { this.name = name; }
    describe(): string { return "I am " + this.name; }
}
class Dog extends Animal {
    breed: string;
    constructor(name: string, breed: string) {
        super(name);
        this.breed = breed;
    }
    bark(): string { return this.name + " (" + this.breed + ") says woof"; }
}

class Counter {
    static current: number = 0;
    static increment(): number { return ++Counter.current; }
}
```

### Interfaces + object literals

```ts
interface Point { x: number; y: number; }
interface Line  { from: Point; to: Point; label: string; }

const line: Line = {
    from: { x: 0, y: 0 },
    to:   { x: 3, y: 4 },
    label: "hypotenuse",
};
```

### Higher-order array methods

```ts
const nums: number[] = [1, 2, 3, 4, 5];
const doubled = nums.map((n) => n * 2);
const evens = nums.filter((n) => n % 2 === 0);
const sum = nums.reduce((acc, n) => acc + n, 0);
const first = nums.find((n) => n > 3);
console.log(nums.some((n) => n > 10), nums.every((n) => n > 0));

// Named function references work too:
const doubler = (x: number) => x * 2;      // lifted to static C fn
function isEven(n: number): boolean { return n % 2 === 0; }
nums.map(doubler).filter(isEven);
```

### Regex

```ts
const re = /\d+/;
re.test("42");                                   // true
"hello world".replace(/world/, "there");         // "hello there"
"a1 b2 c3".replace(/\d/g, "X");                  // "aX bX cX"
"pi=3.14 e=2.71".match(/\d+\.\d+/g);             // ["3.14", "2.71"]
"one  two   three".split(/\s+/);                 // ["one","two","three"]
/hello/i.test("HELLO");                          // true
```

### Spread + Object helpers + nullish

```ts
const combined = [0, ...[1, 2, 3], 4];           // [0,1,2,3,4]
Object.keys({ x: 1, y: 2 } as { x: number; y: number });  // ["x","y"]

function find(id: number): User | null { /* ... */ }
const u = find(2);
console.log(u?.name ?? "not found");             // optional chaining + nullish
```

### Map + Set

```ts
const ages = new Map<string, number>();
ages.set("alice", 30).set("bob", 25);
ages.get("alice");          // 30
ages.has("carol");          // false
ages.keys().forEach((n) => console.log(n));

const seen = new Set<number>();
seen.add(1); seen.add(2); seen.add(2);
console.log(seen.size);     // 2
```

### Exceptions

```ts
function mayThrow(n: number): number {
    if (n < 0) throw "negative: " + n;
    return n * 2;
}
try {
    console.log(mayThrow(-3));
} catch (e) {
    console.log("caught:", e);
}
```

### JSON (type-driven stringify)

```ts
interface Person { name: string; age: number; active: boolean; }
const alice: Person = { name: "Alice", age: 30, active: true };
console.log(JSON.stringify(alice));
// => {"name":"Alice","age":30,"active":true}
```

### fs + path + os + Date

```ts
fs.writeFileSync("/tmp/hello.txt", "hi");
const s = fs.readFileSync("/tmp/hello.txt");
console.log(path.join("/tmp", "sub", "x.txt"));
console.log(os.platform(), os.arch(), os.cpus().length);
const t = Date.now();
```

### switch / case

```ts
function describe(n: number): string {
    switch (n) {
        case 0:        return "zero";
        case 1: case 2: case 3:
                       return "small";
        case 10:       return "ten";
        default:       return "other";
    }
}
```

### Multi-file imports

```ts
// src/math.ts
export function add(a: number, b: number): number { return a + b; }

// src/main.ts
import { add } from "./math";
console.log(add(2, 3));
```

The entry file plus every reachable `.ts` is compiled together. Each module's top-level code becomes `mod_init_<id>()` — called by `main()` in topological order.

## Architecture

```
 entry.ts
   │
   ▼
 ts.createProgram (TypeScript Compiler API: parser, type checker, module resolver)
   │
   ▼
 resolve.ts — walks imports, builds module graph, topo-sorts modules
   │
   ▼
 emit/ — per-module AST walker:
           • consults TypeChecker for each expression type
           • picks a specialized C type (double / tsc_str_t* / tsc_array_t* /
             tsc_map_t* / Class_t*) — no boxing overhead in the typed path
           • wraps each module's top-level code in mod_init_<id>()
   │
   ▼
 runtime/ — hand-written C11 linked into every binary:
           • UTF-8 strings, dynamic arrays, Map/Set, JS-compatible number formatting
           • console / process / fs / path / Math / os / Date / Number
           • exceptions (setjmp / longjmp + single-string error state)
           • Boehm GC behind a wrapper (malloc fallback for --no-gc)
   │
   ▼
 gcc -std=c11 -O2 main.c runtime/tsc_runtime.c -lgc -lm -o <output>
```

### Memory model

Boehm GC — a conservative tracing collector. No runtime changes needed per class, handles cycles correctly, matches JS semantics. Strings, arrays, maps, sets, and class instances are all `GC_MALLOC`'d.

### Multi-file compilation

Every `.ts` file reachable from the entry is compiled into the same `main.c`. Each module's top-level statements become a `mod_init_<moduleId>()` function. `main()` calls them in topological order (dependencies before dependents), then returns.

### Exceptions

`throw` constructs an error frame and `longjmp`s to the most recent `setjmp` set by a `try`. No stack traces yet, but the message is preserved through `tsc_current_error()`. Uncaught exceptions exit the process with a printed message.

### Three hard limits

Three TS/JS features can't be AOT-compiled regardless of engineering effort:

1. **Native C++ addons** under `node_modules/*/build/Release/*.node` — compiled against Node's V8 ABI. Detection + error planned for Phase 14.
2. **`eval`** and the `Function` constructor — require a compiler at runtime.
3. **Dynamic `require(variable)`** where the module path isn't a string literal — can't be walked statically.

## Tests

```
TSC2C_NO_GC=1 bun tests/e2e/run.ts
```

```
e2e: advanced      … OK      (spread + Object.keys + padStart/pad/replace + Array.from)
e2e: arith         … OK
e2e: array_hof     … OK      (map/filter/reduce/find/some/every)
e2e: arrays        … OK
e2e: captures      … OK      (module-level let/const used inside functions + arrows)
e2e: classes       … OK
e2e: exceptions    … OK
e2e: fizzbuzz      … OK
e2e: fn_refs       … OK      (named function references as HOF callbacks)
e2e: fs_roundtrip  … OK
e2e: greet         … OK
e2e: hello         … OK
e2e: inheritance   … OK
e2e: interfaces    … OK
e2e: json          … OK
e2e: map_set       … OK
e2e: math          … OK
e2e: modules       … OK      (multi-file imports)
e2e: nullish       … OK      (?. and ??)
e2e: regex         … OK      (POSIX ERE)
e2e: stdlib_os     … OK
e2e: strings       … OK
e2e: switch        … OK
e2e: wordcount     … OK      (real-world demo: fs+regex+Map+sort+captures)

24 passed, 0 failed
```

Drop `TSC2C_NO_GC=1` after `sudo apt-get install libgc-dev`.

## Repo layout

| Path | What |
|------|------|
| `src/cli.ts` | Command-line entry (commander) |
| `src/compile.ts` | Pipeline: program → graph → emit → gcc |
| `src/program.ts` | `ts.createProgram` + `TypeChecker` wrapper |
| `src/resolve.ts` | Module graph walker, topological sort |
| `src/emit/index.ts` | AST → C emitter (statements, expressions, classes, modules, HOFs) |
| `src/emit/types.ts` | TS type → C type mapping |
| `src/emit/cbuf.ts` | Indented C source writer with escape helpers |
| `src/emit/mangle.ts` | Identifier mangling (avoids C keywords) |
| `src/link/cc.ts` | Spawns gcc with our flags |
| `src/diagnostics.ts` | User-facing error reporting |
| `runtime/tsc_runtime.{c,h}` | Full runtime: strings, arrays, maps/sets, console, fs, path, Math, os, Date, Number, JSON, exceptions |
| `stdlib/lib.core.d.ts` | Type shim (replaces `@types/node`) |
| `tests/e2e/cases/` | One dir per test: `in.ts` + optional support files + `expected.stdout` |
| `tests/e2e/run.ts` | E2E harness: compile, execute, diff |

## What's next

The plan file at `~/.claude/plans/make-a-typescript-to-floating-comet.md` sequences the remaining phases. Highest leverage:

1. **Phase 3 (NaN-boxing)** — unlocks untyped code paths, `any`/`unknown`, `JSON.parse` into objects, and the ability to compile most pure-JS npm packages.
2. **Phase 6 (async/await + libuv)** — needed for real Node programs that do I/O concurrently.
3. **Phase 14 (npm integration)** — walks `node_modules`, respects `package.json` `exports`, detects native addons. Depends on 3 + 6.

Phases 3 and 6 are each multi-week undertakings. Phase 14 is about a month on top of those.
