# TypeScriptC

A whole-program TypeScript-to-C transpiler that produces native Linux binaries.

Goal: take a Node.js-style TypeScript app and get back a standalone executable that behaves like `node app.ts` — without Node at runtime. It uses the **official TypeScript Compiler API** for parsing and type-checking, generates C11, and invokes **gcc** to produce the binary. Memory is managed by **Boehm GC** (`libgc`).

## Status

Substantial working subset, verified by **822 passing end-to-end tests** including a real word-count CLI that tokenizes via regex, counts via `Map`, sorts by a user comparator, and reads `process.env`. ~43,100 LOC across the TypeScript compiler (~28,800 LOC), C/C++ runtime (~12,750 LOC), and `@types/node` replacement shim (~1,580 LOC).

**Phases complete:**

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Bootstrap (gcc driver, build dir, CLI, `--no-gc` fallback) | ✅ |
| 1 | Typed core — primitives, operators, control flow, `switch` (with exhaustiveness), `??`, `?.`, `for-in`, `void`, comma operator, tagged templates including `String.raw` | ✅ |
| 2a | Typed arrays — literal (with spread `[...a, b]`), indexing, `.length`, push/pop/shift/unshift, every non-mutating method (`at`, `slice`, `concat`, `join`, `keys`/`values`/`entries`, `flat`/`flatMap`, `toReversed`/`toSorted`/`toSpliced`/`with`, `lastIndexOf`/`indexOf`/`includes`, `reduce`/`reduceRight`, `findLast`/`findLastIndex`), every mutating method (`sort`/`reverse`/`splice`/`copyWithin`/`fill`), and statics (`Array.from`/`Array.of`/`Array.isArray`) | ✅ |
| 2b | Classes — fields, ctor, methods, `new`, `this`, `extends`, `super()`, static fields/methods, **static initialization blocks**, abstract/access/readonly modifiers, generic classes (erased), computed member names | ✅ |
| 2c | Higher-order array methods (`forEach`/`map`/`filter`/`reduce`/`reduceRight`/`find`/`findIndex`/`findLast`/`findLastIndex`/`some`/`every`) with **inline arrows OR named function references OR closure callback values**, receiver array callback arguments | ✅ |
| 2d | Top-level `const f = (...) => ...` lifts to a static C function — usable as a call target AND as an HOF callback | ✅ |
| 2.5 | Interfaces (incl. `extends`), object literals with typed shape, computed property names, `Object.keys`/`values`/`entries`/`fromEntries`/`groupBy` | ✅ |
| 4 | Multi-file module graph — flat namespace, local imports, topological init, type-only imports, barrel/star/default re-exports, default class/anonymous-function/export-assignment imports | ✅ |
| 5 | Exceptions — `throw` / `try` / `catch` / `finally` via setjmp/longjmp, full `Error`/`TypeError`/`RangeError`/`SyntaxError`/`ReferenceError`/`EvalError`/`URIError`/`AggregateError` object subset | ✅ |
| 6 (immediate) | **Promise + `async`/`await` (immediate subset)** — `new Promise(executor)` synchronous executor, `Promise.resolve`/`reject` with native adoption, `Promise.try`, `.then`/`.catch`/`.finally` with handler passthrough, callback-returned native Promise adoption, `finally` returned-Promise state adoption, and throw→rejection conversion, settled-array `Promise.all`/`allSettled`/`race`/`any` (incl. AggregateError + pending propagation), `async function`/method/value returning immediate Promise records, immediate `await` over native promises and non-Promise values, `try`/`catch` over rejected awaits, bounded before-exit `queueMicrotask(callback)` draining after `process.nextTick`, bounded zero-delay `setTimeout(callback, 0|-0|undefined|void 0, ...args)` with cancellable numeric handles (`clearTimeout` / `clearInterval`) and undefined no-op clears, and bounded before-exit `setImmediate(callback, ...args)` with cancellable numeric handles and undefined no-op clears draining after next ticks, microtasks, and zero-delay timeouts. Suspend/resume state machines, Promise microtask scheduling, and libuv timers still deferred. | ✅ |
| 7 (partial) | `Map<K,V>` + `Set<T>` with insertion-order hash tables, SameValueZero numeric keys, `new Set(array)`/`new Map(Object.entries(...))`/`new Map(map)`/`new Set(set)`, typed `WeakMap<K,V>`/`WeakSet<T>`/`WeakRef<T>`/`FinalizationRegistry<T>` (register/unregister; cleanup never fires in AOT), `Set.keys`, ES2025 Set composition (`union`/`intersection`/`difference`/`symmetricDifference`/`isSubsetOf`/`isSupersetOf`/`isDisjointFrom`), ES2024 `Map.groupBy`/`Object.groupBy`, collection `forEach` (inline/named/closure), collection `toString`/`toLocaleString`/`valueOf`, direct `for...of` over strings/Map/Set, **custom iterable classes** (array-backed and class-iterator-object form), **direct self-iterable iterator objects**, inherited `next()`, `ObjectEntry<T>` destructuring, **eager `function*` generators** (yield, `yield*` over arrays/strings/dynamic iterables, `.next()`/`.return(value)`/`.throw(error)`; lazy suspend/resume still deferred) | ✅ |
| 7 (partial) | JSON.stringify (type-driven, recursive for arrays and objects; object-property omission for `undefined`/function values) + JSON.parse via dynamic values | ✅ |
| 8 (partial) | **RegExp via PCRE2** (`/pattern/flags`, `new RegExp(pattern, flags?)`, `RegExp.escape`, `re.exec`, `re.test`, `re.source`/`flags`/flag booleans including `hasIndices`/`sticky`, `re.toString`/`toLocaleString`/`valueOf`, `s.replace`/`replaceAll`/`match`/`matchAll`/`search`/`split` with both string and RegExp patterns and full replacement-token expansion `$&`/`$1`/`$<name>`/`` $` ``/`$'`, capture groups, lookahead/lookbehind, named capture syntax, Unicode properties) | ✅ |
| 9 | **Proxy + Reflect over dynamic values** — all object traps, callable/constructable proxy paths, revocation, own-key/descriptor/prototype/extensibility invariants, and dynamic `Reflect.apply` / `Reflect.construct` validation | ✅ |
| 10+ | **Sync Node stdlib** — `fs` (read/write including explicit readFile Buffer/null options/append/exists/readdir/realpath/readlink/mkdtemp incl. Buffer encoding, bounded Buffer/file URL path arguments, recursive + Dirent, stat/lstat with full numeric metadata + timestamps + kind predicates, symlink/link/truncate/utimes/lutimes/chown/lchown/chmod/access with constants/mkdir with mode/unlink/rm/rmdir/cp recursive with symlink options/copyFile/rename plus literal encoding/recursive/withFileTypes/bigint/flag/mode options), `path` (incl. `posix`, `parse`/`format`, `normalize`, `relative`, `basename(p, suffix?)`, `toNamespacedPath`, constants), `Math` (full libm + int32 + fround + constants), `os` (incl. `devNull`, system stats, user info), `Date` (`UTC`/`parse`/`now`, local constructor overloads, instance methods, UTC/local getters and UTC/local setters, ISO/UTC/JSON formatting), `Number.*` statics + predicates + global `isNaN`/`isFinite` coercion, `Buffer` (alloc/allocUnsafe/concat/copy/fill/from(Buffer)/base64/int IO/uint IO/uint multi-byte IO/float IO/swap/search/static methods/write/toJSON + object methods), `URL` (incl. `canParse` and bounded base resolution), synchronous `EventEmitter` (full subset: `on`/`addListener`/`prependListener`/`once`/`prependOnceListener`/`off`/`removeListener`/`removeAllListeners`/`emit`/`listenerCount`/`listeners`/`rawListeners`/`eventNames`/`setMaxListeners`/`getMaxListeners`, module-level helpers, `events.once` promise form, static `EventEmitter.listenerCount`, `defaultMaxListeners`, unhandled `error` throwing), synchronous `Event`/`EventTarget` (`addEventListener`/`removeEventListener` with literal options, `dispatchEvent`, cancelable events, `preventDefault`), **`process.env`/`cwd`/`chdir`/`argv`/`argv0`/`pid`/`ppid`/`platform`/`arch`/`title`/`versions`/`release`/`features`/`hrtime`/`hrtime.bigint`/`memoryUsage`/`resourceUsage`/`cpuUsage`/`getgroups`/`umask`/`uid`/`gid`/`euid`/`egid`/`kill`/`stdout.write`/`stderr.write`/`nextTick` (bounded queue with up to three callback args)** | ✅ |
| 11 (immediate) | **`fs.promises` immediate-settled wrappers** around every supported sync fs call, **`dns.lookup` and `dns.promises.lookup`** (host `getaddrinfo`, `family`/`all`/`hints`/literal `verbatim`/`order` options), **`net.isIP`/`isIPv4`/`isIPv6`**, minimal `process.stdout`/`stderr.write` stream subset, named + namespace + node-prefixed imports. libuv-backed async scheduling, sockets, http/https, http2, broader stream APIs all still deferred. | ✅ |
| 13 (partial) | **`child_process.exec`/`execFile`/`execSync`/`execFileSync`/`spawnSync`** — immediate-callback and sync subsets with full literal-option coverage (`cwd`/`env`/`encoding`/`shell` literal/false/string/`argv0`/`detached`/`maxBuffer` numeric/`timeout` numeric/`killSignal` string|numeric/`uid`/`gid`/POSIX-inert `windowsHide`/`windowsVerbatimArguments`), explicit `stdio` `pipe`/`ignore`/`inherit` forms and numeric fd tuples, `ENOENT`/`ETIMEDOUT`/`ENOBUFS` propagation, signal-terminated child reporting, nonzero status capture. Async event-loop child handles, `fork`, `cluster`, `worker_threads` deferred. | ✅ |
| 14 (partial) | **`node_modules` package source transpilation** — TypeScript packages and basic JavaScript packages via `allowJs` enter the module graph (package `exports`, `main` fallback, `imports`, namespace imports, side-effect-only imports). Untyped JS object/array literals lower as dynamic values. **CommonJS package source subset** lowers `exports.name = ...`, `module.exports.name = ...`, static top-level aliases such as `const out = exports` / `const mod = module.exports`, chained `exports.name = module.exports.name = ...`, chained `module.exports.name = exports.name = ...`, `exports.name = void 0` / `module.exports.name = void 0` placeholder elision, `exports.default = ...`, `Object.defineProperty(exports, "default", { value })` default interop, `Object.defineProperty(exports, "name", { value })`/`Object.defineProperty(module.exports, "name", { value })` data exports, statically computed `Object.defineProperty`/`Object.defineProperties` keys, and static descriptor-variable `Object.defineProperty(exports, "name", descriptor)` exports and descriptor values backed by `require("./local.js").member`, `Object.defineProperties(exports, { name: descriptor })` descriptor-map entries where `descriptor` may be a static object-literal variable, and static declared descriptor-map `Object.defineProperties(exports, descriptors)` exports, `Object.defineProperties(exports, Object.getOwnPropertyDescriptors(api))` descriptor-preserving exports, `Object.assign(exports, { name: value })`, getter entries in `Object.assign(exports, { get name() { return value; } })`, and static declared-object and static object-spread `Object.assign(exports, api)` data/default export mutation, `Object.assign(exports, Object.fromEntries(...))` data/default export mutation, `Object.assign(exports, require("./local.js"))` package-local re-export mutation plus individual static `require("./local.js").member` values, simple zero-arg `Object.defineProperty(..., { get() { return value; } })` getter exports, computed string-key exports including static string concatenation/template literals, static named metadata from `module.exports = { ...api }`, `module.exports = Object.create(proto, descriptors)`, wrapped `module.exports = Object.freeze(Object.create(proto, descriptors))`, wrapped `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` over `Object.create(proto, descriptors)`, wrapped `module.exports = Object.freeze(Object.defineProperties({}, descriptors))`, wrapped `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` over `Object.defineProperties({}, descriptors)`, wrapped `module.exports = Object.freeze(Object.defineProperty(object, key, descriptor))` and `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` variants, wrapped `module.exports = Object.freeze(Object.assign(...))`, wrapped `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` over `Object.assign(...)`, `module.exports = Object.assign(...)`, `module.exports = Object.assign(exports, ...)`, `module.exports = Object.defineProperties(...)` with static target object and wrapper-target metadata, `module.exports = Object.defineProperty(...)` including static target object and wrapper-target metadata, `module.exports = Object.fromEntries([...])`, and static `Object.freeze`/`Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` wrappers, object-literal/function-valued/arrow-valued/method-valued/identifier-valued/primitive/array `module.exports = ...` defaults, whole-value `module.exports = exports.default = fn` function chains, runtime-computed `Object.assign`/`Object.create`/`Object.defineProperty`/`Object.defineProperties`/`Object.fromEntries`/`Object.setPrototypeOf`/`Object.preventExtensions`/`Object.seal`/`Object.freeze`/object-spread defaults, top-level and function-scope literal `require("pkg")` namespace/destructure/direct-default/member calls and reads plus function-scoped `require` / `module.require` aliases, package-local `require("./local.js")`, top-level static `require` / `module.require` aliases, function-scoped `require` / `module.require` aliases, `module.require(...)`, side-effect-only requires, `__filename`/`__dirname`/`module.filename`/`module.id`/`module.path`/`module.loaded`/`module.paths`/`module.parent`/`module.children`/`module.isPreloading` wrapper globals, transpiled-ESM `__esModule` marker elision including `exports.__esModule = true`. Native addon detection rejects `build/Release/*.node` package roots including transitively unless a compile-time native-addon manifest routes the binding through the embedded Node bridge. Dependency init is eager through the AOT graph by design; dual CJS/ESM runtime semantics and broader dynamic computed exports remain deferred. | ✅ |
| 2d+ | **Module-level captures** — top-level `const/let` are emitted as file-scope statics, so top-level functions AND lifted arrow consts can read/write them as ordinary globals | ✅ |
| 2e | **Function-scope closures** — first-class typed arrow/function expressions lower to generated `{fn, env}` closure structs with captured locals boxed in ref cells; spread calls through function values; optional pointer/dynamic parameters without defaults | ✅ |
| 3 foundation | **Dynamic values** — `any`/`unknown` map to NaN-boxed `tsc_value_t`. Full dynamic property/index reads + writes (incl. compound, logical, exponent, bitwise), `in`/`delete`, every dynamic operator (arithmetic/equality/relational/logical/nullish/bitwise/unary/update), every dynamic string and array method shipped on the typed path, dynamic `Array.isArray`/`Array.from`/`Array.of`/`Array.from(..., mapfn)`, dynamic `Object.is`/`assign`/`keys`/`values`/`entries`/`fromEntries`/`hasOwn`/`hasOwnProperty`/`isPrototypeOf`/`propertyIsEnumerable`/`getOwnPropertyNames`/`getOwnPropertyDescriptors`/`defineProperties`/`getPrototypeOf`/`setPrototypeOf`/`create` (incl. descriptor maps)/`seal`/`freeze`/`preventExtensions` with state, data + accessor (named-function, lifted-arrow, closure-valued, undefined absent-hook) descriptors with stable boxed `get`/`set` identities, configurable/non-configurable redefinition rules, kind transitions, descriptor shorthand, receiver-bound `this`, dynamic `Reflect.get`/`set`/`has`/`deleteProperty`/`ownKeys`/`defineProperty`/`getPrototypeOf`/`setPrototypeOf`/`getOwnPropertyDescriptor`/`isExtensible`/`preventExtensions`/`apply` (dispatching boxed accessor identities). Typed/dynamic string and array Object/Reflect own-property enumeration + descriptors. Bounded dynamic array extensibility/seal/freeze + descriptor flags. | ✅ |

**Still deferred:**

- **Phase 3 remainder** — hidden classes / shape trees, inline caches and diagnostics, complete built-in prototype semantics for arbitrary npm-shaped objects.
- **Phase 6 remainder** — real suspend/resume `await` state-machine lowering, microtask-scheduled `.then` dispatch beyond the bounded before-exit `queueMicrotask` queue, nonzero-delay/libuv-backed `setTimeout`, `setInterval`, and real event-loop-backed `setImmediate`, arbitrary thenable assimilation.
- **Phase 7 remainder** — lazy generator state machines with suspend/resume `yield`, bidirectional `.next(value)`, async generators (`async function*`), broader iterator-protocol edge cases.
- **Phases 11–13 remainder** — libuv-backed async `fs.promises` scheduling, broader `events` async iterator helpers, full readable/writable/transform `stream`, `http`/`https`/`http2` (OpenSSL), `net` sockets/connect/listen, async `child_process` lifecycle handles, `cluster`, `worker_threads`.
- **Phase 14 remainder** — broader CommonJS wrapper semantics, dual CJS/ESM interop edge cases, broader untyped JavaScript package patterns, and additional AOT require/export metadata shapes. Dependency init stays eager through the AOT module graph by design.
- **Decorators** — broader replacement edge cases beyond the covered computed-name, proxy-backed, and erased-generic constructor forms.

See `~/.claude/plans/make-a-typescript-to-floating-comet.md` for the full 15-phase plan, and [`docs/todo.md`](docs/todo.md) for the active remaining work.

## Documentation

Full docs live in [`docs/`](docs/). Fast routing:

- [`docs/done.md`](docs/done.md) — every implemented feature with test pointers (~1,000 lines)
- [`docs/todo.md`](docs/todo.md) — active remaining implementation work
- [`docs/architecture.md`](docs/architecture.md) — pipeline + Mermaid diagrams
- [`docs/cli.md`](docs/cli.md) — CLI flags, exit codes, env vars
- [`docs/runtime-reference.md`](docs/runtime-reference.md) — every `tsc_*` C symbol
- [`docs/testing.md`](docs/testing.md) — e2e harness and how to add a case
- [`CHANGELOG.md`](CHANGELOG.md) — session-by-session history
- [`llms.txt`](llms.txt) / [`llms-full.txt`](llms-full.txt) — LLM-oriented index + full bundle
- [`examples/README.md`](examples/README.md) — 7 runnable demo programs
- [`.claude/skills/tsc2c-add-feature/SKILL.md`](.claude/skills/tsc2c-add-feature/SKILL.md) — procedural skill for adding a new language feature

## Quick start

```bash
# one-time: install native libraries for runtime features.
# without it, pass --no-gc and the binary will leak (fine for short programs).
sudo apt-get install -y libgc-dev libssl-dev libicu-dev libgmp-dev libpcre2-dev

bun install

./bin/tsc2c examples/hello.ts -o /tmp/hello && /tmp/hello
./bin/tsc2c examples/fizzbuzz.ts -o /tmp/fb && /tmp/fb
./bin/tsc2c examples/collections.ts -o /tmp/coll && /tmp/coll    # Map + Set + HOFs
./bin/tsc2c examples/wordcount.ts -o /tmp/wc && /tmp/wc README.md 5
```

`bin/tsc2c` prefers `bun` (runs TS directly); falls back to `node dist/cli.js` if you've run `bun run build`.

## CLI

```
tsc2c <entry.ts> [options]

  -o, --output <path>       output binary path (default: a.out)
  --emit-c-only             write generated C to the build dir, skip gcc
  --keep-build-dir <path>   reuse an explicit build dir (default: tempdir)
  --no-gc                   link without libgc (leaking malloc fallback)
  --release                 optimize for smaller stripped binaries
  --verbose                 print compile steps + gcc command
```

See [`docs/cli.md`](docs/cli.md) for exit codes and environment variables.

## Feature tour

Each of the following compiles and runs end-to-end. See [`tests/e2e/cases/`](tests/e2e/cases/) for the full 822-case suite and [`docs/done.md`](docs/done.md) for the complete capability inventory.

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
    static { Counter.current = 1; }       // static initialization block
    static increment(): number { return ++Counter.current; }
}
```

### Interfaces + object literals

```ts
interface Point { x: number; y: number; }
interface Line  extends Point { from: Point; to: Point; label: string; }

const line: Line = {
    x: 0, y: 0,
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

### Regex (PCRE2)

```ts
const re = /\d+/;
re.test("42");                                   // true
"hello world".replace(/world/, "there");         // "hello there"
"a1 b2 c3".replace(/\d/g, "X");                  // "aX bX cX"
"pi=3.14 e=2.71".match(/\d+\.\d+/g);             // ["3.14", "2.71"]
"one  two   three".split(/\s+/);                 // ["one","two","three"]
/hello/i.test("HELLO");                          // true
new RegExp("(?<year>\\d{4})", "u").exec("2026"); // named capture + Unicode
```

### Map + Set (incl. ES2025 composition)

```ts
const ages = new Map<string, number>();
ages.set("alice", 30).set("bob", 25);
ages.get("alice");          // 30
ages.has("carol");          // false

const seen = new Set<number>([1, 2, 3]);
const more = new Set<number>([2, 3, 4]);
seen.union(more);           // Set {1,2,3,4}
seen.intersection(more);    // Set {2,3}
seen.isSubsetOf(more);      // false

// ES2024 groupBy
const items = [{ k: "a", v: 1 }, { k: "b", v: 2 }, { k: "a", v: 3 }];
Map.groupBy(items, (it) => it.k);   // Map { "a" => [...], "b" => [...] }
```

### Generators (eager) + custom iterators

```ts
function* range(n: number): Generator<number> {
    for (let i = 0; i < n; i++) yield i;
    yield* [100, 101];
}
for (const x of range(3)) console.log(x);    // 0 1 2 100 101

class Counter implements Iterable<number> {
    constructor(private max: number) {}
    [Symbol.iterator](): Iterator<number> {
        let i = 0;
        const max = this.max;
        return { next: () => i < max ? { value: i++, done: false } : { value: undefined, done: true } };
    }
}
```

### Promise + async/await (immediate subset)

```ts
async function fetchValue(): Promise<number> { return 42; }
async function main(): Promise<void> {
    try {
        const v = await fetchValue();         // immediate await over a fulfilled value
        console.log(v);
    } catch (e) { console.log("err", e); }
}
main();

Promise.all([Promise.resolve(1), Promise.resolve(2)])
    .then((xs) => console.log(xs.reduce((a, b) => a + b, 0)));   // 3
```

### Exceptions + Error hierarchy

```ts
function parsePort(s: string): number {
    const n = Number(s);
    if (Number.isNaN(n)) throw new TypeError("not a number: " + s);
    if (n < 0 || n > 65535) throw new RangeError("out of range: " + n);
    return n;
}
try { parsePort("nope"); }
catch (e) { if (e instanceof TypeError) console.log("type:", e.message); }
```

### JSON (type-driven stringify + dynamic parse)

```ts
interface Person { name: string; age: number; active: boolean; }
const alice: Person = { name: "Alice", age: 30, active: true };
console.log(JSON.stringify(alice));
// => {"name":"Alice","age":30,"active":true}

const parsed: any = JSON.parse('{"x": 1, "y": [2, 3]}');
console.log(parsed.y[1]);                       // 3
```

### Spread + Object helpers + nullish

```ts
const combined = [0, ...[1, 2, 3], 4];           // [0,1,2,3,4]
Object.keys({ x: 1, y: 2 } as { x: number; y: number });  // ["x","y"]
Object.entries({ x: 1, y: 2 } as { x: number; y: number }); // [["x",1],["y",2]]

function find(id: number): User | null { /* ... */ }
const u = find(2);
console.log(u?.name ?? "not found");             // optional chaining + nullish
```

### fs + fs.promises (immediate) + path + os + Date

```ts
fs.writeFileSync("/tmp/hello.txt", "hi");
const s = fs.readFileSync("/tmp/hello.txt");
const st = fs.statSync("/tmp/hello.txt");
console.log(st.size, st.isFile(), st.mtimeMs);

await fs.promises.writeFile("/tmp/p.txt", "hello", { flag: "wx" });
const entries = await fs.promises.readdir("/tmp", { withFileTypes: true });

console.log(path.join("/tmp", "sub", "x.txt"), path.parse("/a/b/c.txt"));
console.log(os.platform(), os.arch(), os.cpus().length, os.devNull);
const t = Date.now();
```

### child_process (sync + immediate-callback subset)

```ts
import { execSync, spawnSync } from "node:child_process";

const out = execSync("echo hi", { encoding: "utf8" });          // "hi\n"
const r = spawnSync("ls", ["-la"], { encoding: "utf8", cwd: "/tmp" });
console.log(r.status, r.stdout.length);
```

### Multi-file imports + node_modules subset

```ts
// src/math.ts
export function add(a: number, b: number): number { return a + b; }

// src/main.ts
import { add } from "./math";                 // local module
import lodash from "lodash";                  // resolvable TS/JS package source
console.log(add(2, 3));
```

The entry file plus every reachable `.ts` / supported `.js` (and resolved CommonJS package source) is compiled together. Each module's top-level code becomes `mod_init_<id>()` — called by `main()` in topological order.

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
           • NaN-boxes `any` / `unknown` / unions into `tsc_value_t`
           • wraps each module's top-level code in mod_init_<id>()
   │
   ▼
 runtime/ — hand-written C11 linked into every binary:
           • UTF-8 strings, dynamic arrays, Map/Set/WeakMap/WeakSet/WeakRef,
             FinalizationRegistry, PCRE2 regex, GMP BigInt, ICU normalization
           • console / process / fs / fs.promises immediate / path / Math /
             os / Date / Number / Buffer / URL / dns / net / child_process
           • EventEmitter, Error hierarchy, Promise (immediate), generators (eager)
           • exceptions (setjmp / longjmp + single-string error state)
           • Boehm GC behind a wrapper (malloc fallback for --no-gc)
   │
   ▼
 gcc -std=c11 -O2 main.c runtime/tsc_runtime.c -lgc -lm -lresolv -lpcre2-8 -lssl -lcrypto -licuuc -licui18n -lgmp -o <output>
 # --release switches the gcc optimization/link mode to -Os -s.
```

For pipeline diagrams (Mermaid), see [`docs/architecture.md`](docs/architecture.md).

### Memory model

Boehm GC — a conservative tracing collector. No runtime changes needed per class, handles cycles correctly, matches JS semantics. Strings, arrays, maps, sets, and class instances are all `GC_MALLOC`'d.

### Multi-file compilation

Every `.ts` file reachable from the entry is compiled into the same `main.c`. Each module's top-level statements become a `mod_init_<moduleId>()` function. `main()` calls them in topological order (dependencies before dependents), then returns.

### Exceptions

`throw` constructs an error frame and `longjmp`s to the most recent `setjmp` set by a `try`. No stack traces yet, but the message is preserved through `tsc_current_error()`. Uncaught exceptions exit the process with a printed message.

### AOT closure requirements

Some TS/JS features require build-time proof, an explicit security allow list, or an explicitly gated embedded-Node bridge:

1. **Native C++ addons** under `node_modules/*/build/Release/*.node` — default builds reject them; known native-addon manifests route through the embedded Node bridge rather than direct C++ calls. `bun run test:native-addon-smoke` exercises a real N-API addon when `libnode` is available.
2. **`eval`** and the `Function` constructor — constant and allow-listed sources compile AOT by default. Unknown runtime strings require `--unsafe-eval`, which emits embedded Node bridge calls behind the `TSC_UNSAFE_EVAL` compile flag and requires `libnode` at link time.
3. **Dynamic `require(variable)`** — finite const-string specifiers and manifest-listed alternatives are part of the AOT graph; non-finite unlisted specifiers remain rejected.

## Tests

```
TSC2C_NO_GC=1 bun tests/e2e/run.ts
```

822 e2e cases under [`tests/e2e/cases/`](tests/e2e/cases/), each a directory containing `in.ts` (and any support files) plus `expected.stdout` / `expected.exitcode`. The harness compiles each case, executes the binary, and diffs the output. See [`docs/testing.md`](docs/testing.md) for how to add a case and [`docs/done.md`](docs/done.md) for what each one exercises.

Drop `TSC2C_NO_GC=1` after `sudo apt-get install libgc-dev`; OpenSSL, ICU, GMP, and PCRE2 are still required for crypto, Unicode normalization, BigInt, and regex.

## Repo layout

| Path | What |
|------|------|
| `bin/tsc2c` | POSIX shell entrypoint — picks `bun` or `node dist/cli.js` |
| `src/cli.ts` | Command-line entry (commander) |
| `src/compile.ts` | Pipeline: program → graph → emit → gcc |
| `src/program.ts` | `ts.createProgram` + `TypeChecker` wrapper |
| `src/resolve.ts` | Module graph walker, topological sort, CommonJS edge collection |
| `src/emit/index.ts` | AST → C emitter (~26,100 LOC; statements, expressions, classes, modules, HOFs, dynamic value bridging) |
| `src/emit/types.ts` | TS type → C type mapping |
| `src/emit/cbuf.ts` | Indented C source writer with escape helpers |
| `src/emit/mangle.ts` | Identifier mangling (avoids C keywords) |
| `src/link/cc.ts` | Spawns gcc with our flags |
| `src/diagnostics.ts` | User-facing error reporting |
| `runtime/` | Full C/C++ runtime (~12,750 LOC): strings, arrays, maps/sets/weak collections, regex, BigInt, exceptions, JSON, console, process, fs + fs.promises, path, Math, os, Date, Number, Buffer, URL, EventEmitter, Event/EventTarget, Error hierarchy, Promise (immediate), generators (eager), dns, net, child_process, and embedded Node bridge |
| `stdlib/lib.core.d.ts` | Type shim (~1,580 LOC; replaces `@types/node`) |
| `examples/` | 7 runnable demo programs |
| `tests/e2e/cases/` | 822 test dirs — `in.ts` + optional support files + `expected.stdout` or `expected.exitcode` |
| `tests/e2e/run.ts` | E2E harness: compile, execute, diff |
| `manual-tests/` | Manual smoke + benchmark sources |
| `docs/` | Browsable documentation set |
| `.claude/skills/` | Repo-local agent skills (procedural feature-add guide) |

## What's next

The plan file at `~/.claude/plans/make-a-typescript-to-floating-comet.md` sequences the remaining phases. With Phase 6 (immediate subset), Phase 7 (eager generators), Phases 11–13 (immediate stdlib subsets), and Phase 14 (TypeScript + basic JS + CommonJS package sources) landed, the highest-leverage remaining work is:

1. **Phase 3 polish** — hidden classes / shape trees + inline caches. Lifts perf for arbitrary-shape objects toward `v8`-class speed.
2. **Phase 6 suspend/resume** — real async state-machine lowering on top of the existing immediate subset, Promise microtask scheduling, libuv timers and async I/O.
3. **Phase 7 lazy generators** — suspend/resume `yield`, bidirectional `.next(value)`, `async function*`.
4. **Phase 14 polish** — broader CommonJS wrapper semantics, dual CJS/ESM interop, broader untyped JS package patterns, and additional AOT require/export metadata shapes.
5. **Phase 11–13 polish** — libuv-backed async fs scheduling, full `stream`, `http`/`https` (OpenSSL), `net` sockets, async `child_process` lifecycle, `worker_threads`.
6. **Decorator polish** — remaining replacement edge cases after the current standard decorator, proxy-backed decorator, and AOT constructor replacement coverage.

[`docs/todo.md`](docs/todo.md) tracks the active remaining items in dependency order.
