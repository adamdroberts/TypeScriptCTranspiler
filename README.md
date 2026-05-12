# TypeScriptC

A whole-program TypeScript-to-C transpiler that produces native Linux binaries.

Goal: take a Node.js-style TypeScript app and get back a standalone executable that behaves like `node app.ts` — without Node at runtime. It uses the **official TypeScript Compiler API** for parsing and type-checking, generates C11, and invokes **gcc** to produce the binary. Memory is managed by **Boehm GC** (`libgc`).

## Status

Substantial working subset, verified by **319 passing end-to-end tests** including a real word-count CLI that tokenizes via regex, counts via `Map`, sorts by a user comparator, and reads `process.env`. ~10,500 LOC across TypeScript compiler + C runtime + type shims.

**Phases complete:**

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Bootstrap (gcc driver, build dir, CLI, `--no-gc` fallback) | ✅ |
| 1 | Typed core — primitives, operators, control flow, functions, `switch`, nullish coalescing `??`, optional chaining `?.` | ✅ |
| 2a | Typed arrays — literal (with spread `[...a, b]`), indexing, `.length`, push/pop/shift/unshift, `for-of`, keys/values, at, reverse/toReversed, fill, copyWithin, with, toSpliced, **sort/toSorted (default + user comparator for typed arrays)**, slice, concat, join, toString/toLocaleString/valueOf, indexOf, lastIndexOf, includes | ✅ |
| 2b | Classes — fields, ctor, methods, `new`, `this`, `extends`, `super()`, static fields + methods | ✅ |
| 2c | Higher-order array methods (`forEach`/`map`/`filter`/`reduce`/`reduceRight`/`find`/`findIndex`/`findLast`/`findLastIndex`/`some`/`every`) with **inline arrows OR named function references**, including receiver array callback arguments | ✅ |
| 2d | Top-level `const f = (...) => ...` lifts to a static C function — usable as a call target AND as an HOF callback | ✅ |
| 2.5 | Interfaces + object literals with typed shape; `Object.keys`/`values`/`entries`/`fromEntries` | ✅ |
| 4 | Multi-file module graph — flat namespace, local imports, topological init | ✅ |
| 5 | Exceptions — `throw` / `try` / `catch` / `finally` via setjmp/longjmp | ✅ |
| 7 (partial) | `Map<K,V>` + `Set<T>` with insertion-order hash tables, SameValueZero numeric keys, `new Set(array)`, `new Map(Object.entries(...))`, typed `WeakMap<K,V>`/`WeakSet<T>`/`WeakRef<T>`, `Set.keys`, collection `forEach` with inline or named callbacks, collection `toString`/`toLocaleString`/`valueOf`, and direct `for...of` over strings/Map/Set | ✅ |
| 7 (partial) | JSON.stringify (type-driven, recursive for arrays and objects) | ✅ |
| 8 (partial) | **RegExp via PCRE2** (`/pattern/flags`, `re.exec`, `re.test`, `re.source`/`flags`/flag booleans including `hasIndices`/`sticky`, `re.toString`/`toLocaleString`/`valueOf`, `s.replace`, `s.match`, `s.matchAll`, `s.search`, `s.split`, capture groups, lookahead/lookbehind, named capture syntax, Unicode properties) | ✅ |
| 10+ | Sync Node stdlib — `fs` (read/write/append/exists/readdir/stat/lstat/realpath/readlink/symlink/link/mkdtemp/truncate/chmod/mkdir/unlink/rm/rmdir/copy/rename, plus bounded UTF-8 and recursive mkdir/rm options), immediate-settled `fs.promises` subset including `stat`, `lstat`, `realpath`, `readlink`, `symlink`, `link`, `mkdtemp`, `truncate`, and `chmod`, `path`, `Math`, `os`, `Date.now`, `Number.*` statics, `Array.isArray`/`Array.from`/`Array.of`, `Buffer` fields + object methods, `URL` fields + `toString`/`toJSON`, synchronous `EventEmitter`, **`process.env`**, **`process.cwd()`**, **`process.argv`** | ✅ |
| 2d+ | **Module-level captures** — top-level `const/let` are emitted as file-scope statics, so top-level functions AND lifted arrow consts can read/write them as ordinary globals | ✅ |
| 2e | **Function-scope closures** — first-class typed arrow/function expressions lower to generated `{fn, env}` closure structs with captured locals boxed in ref cells | ✅ |
| 3 foundation | **Dynamic values** — `any`/`unknown` map to NaN-boxed `tsc_value_t`; supports `JSON.parse`, dynamic JSON stringify with object-property omission for `undefined`/function values, heterogeneous arrays/objects, dynamic property/index reads/writes, dynamic `in`/`delete`, dynamic binary/compound assignment operators, broader dynamic string/array methods including at/concat/copyWithin/fill/keys/values/lastIndexOf/localeCompare/normalize/pad/repeat/replace/string replace tokens/RegExp replace tokens/split/RegExp split/substr/substring/slice/reverse/toReversed/toSorted/toSpliced/with/trim edges/default and comparator sort/splice/toString/valueOf and inline/named/closure array HOFs with receiver callback args including reduceRight/findLast/findLastIndex, dynamic `Array.isArray`/`Array.from`/`Array.of`, typed coercion bridges, `Object.is`/assign/keys/values/entries/fromEntries/names/hasOwn/hasOwnProperty/isPrototypeOf/propertyIsEnumerable/toLocaleString/toString/valueOf/getOwnPropertyDescriptors/defineProperties, data descriptor flags, omitted-field/default handling, and compatible non-configurable redefinition, named-function/lifted-arrow/closure-valued/undefined accessor descriptors with receiver-bound `this`, own undefined absent-hook fields, boxed `get`/`set` identities callable through dynamic `Reflect.apply`, typed/dynamic string own-property enumeration/descriptors, bounded dynamic array extensibility/seal/freeze state and descriptor flags, Object.create with descriptor maps/prototype-chain lookup, and Reflect object helpers including receiver-aware dynamic data writes | ✅ |

**Not implemented in this session (deferred):**

- **Phase 3 remainder** — hidden classes / shape trees, inline caches, remaining descriptor/prototype edge cases, complete built-in/prototype semantics, and npm-scale object behavior.
- **Phase 6 remainder** — `async/await` + libuv event loop + pending Promise/microtask semantics. Settled/immediate `Promise.resolve` / `reject`, synchronous `then` / `catch` / `finally`, and settled-array combinators are implemented.
- **Phase 7 remainder** — lazy generator state machines, bidirectional `.next(value)`, async generators, and broader iterator protocol edge cases.
- **Phase 9** — `Proxy`, `Reflect`, and full property descriptor semantics.
- **Phases 11–13** — Async Node stdlib (libuv-backed fs.promises, broader events module surface, streams, http, net, child_process, worker_threads).
- **Phase 14** — `node_modules` transpilation (requires Phases 3, 6, 7 first).

See `~/.claude/plans/make-a-typescript-to-floating-comet.md` for the full 15-phase plan.

## Documentation

Full docs live in [`docs/`](docs/). Fast routing:

- [`docs/done.md`](docs/done.md) — every implemented feature with test pointers
- [`docs/todo.md`](docs/todo.md) — every remaining item with effort estimates
- [`docs/architecture.md`](docs/architecture.md) — pipeline + Mermaid diagrams
- [`docs/cli.md`](docs/cli.md) — CLI flags, exit codes, env vars
- [`docs/runtime-reference.md`](docs/runtime-reference.md) — every `tsc_*` C symbol
- [`docs/testing.md`](docs/testing.md) — e2e harness and how to add a case
- [`CHANGELOG.md`](CHANGELOG.md) — session-by-session history
- [`llms.txt`](llms.txt) / [`llms-full.txt`](llms-full.txt) — LLM-oriented index + full bundle
- [`examples/README.md`](examples/README.md) — 7 runnable demo programs

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
Object.entries({ x: 1, y: 2 } as { x: number; y: number }); // [["x",1],["y",2]]

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
 # --release switches the gcc optimization/link mode to -Os -s.
```

### Memory model

Boehm GC — a conservative tracing collector. No runtime changes needed per class, handles cycles correctly, matches JS semantics. Strings, arrays, maps, sets, and class instances are all `GC_MALLOC`'d.

### Multi-file compilation

Every `.ts` file reachable from the entry is compiled into the same `main.c`. Each module's top-level statements become a `mod_init_<moduleId>()` function. `main()` calls them in topological order (dependencies before dependents), then returns.

### Exceptions

`throw` constructs an error frame and `longjmp`s to the most recent `setjmp` set by a `try`. No stack traces yet, but the message is preserved through `tsc_current_error()`. Uncaught exceptions exit the process with a printed message.

### Three hard limits

Three TS/JS features can't be AOT-compiled regardless of engineering effort:

1. **Native C++ addons** under `node_modules/*/build/Release/*.node` — compiled against Node's V8 ABI. Literal `.node` imports/requires and imported package roots containing `build/Release/*.node` are rejected before TypeScript diagnostics; broader package export/condition handling remains Phase 14.
2. **`eval`** and the `Function` constructor — require a compiler at runtime. Calls are rejected before TypeScript diagnostics.
3. **Dynamic `require(variable)`** where the module path isn't a string literal — can't be walked statically. Non-literal calls are rejected before emission.

## Tests

```
TSC2C_NO_GC=1 bun tests/e2e/run.ts
```

```
e2e: advanced      … OK      (spread + Object.keys + padStart/pad/replace + Array.from)
e2e: arith         … OK
e2e: array_concat_values … OK (Array.concat with array and single-value args)
e2e: array_copy_within … OK (Array.copyWithin)
e2e: array_entries … OK (Array.entries string-index entry arrays)
e2e: array_fill    … OK      (Array.fill)
e2e: array_flat    … OK      (flat + flatMap array/scalar callbacks)
e2e: array_from_string … OK (Array.from over strings)
e2e: array_hof     … OK      (map/filter/reduce/find/some/every + receiver callback args)
e2e: array_includes_same_value_zero … OK (Array.includes SameValueZero)
e2e: array_is_array_narrowing … OK (Array.isArray narrows unknown dynamic values)
e2e: array_keys_values … OK (Array.keys/values copies)
e2e: array_at      … OK      (Array.at positive/negative indexes)
e2e: array_find_last … OK (Array.findLast/findLastIndex)
e2e: array_last_index_of … OK (Array.lastIndexOf)
e2e: array_of … OK (Array.of typed construction)
e2e: array_own_properties … OK (typed array own-property checks)
e2e: array_property_descriptors … OK (typed array property descriptors)
e2e: array_reduce_no_initial … OK (Array.reduce/reduceRight without initial value)
e2e: array_reduce_right … OK (Array.reduceRight with initial value)
e2e: array_search_from_index … OK (Array indexOf/includes/lastIndexOf fromIndex)
e2e: array_sort_default … OK (JS-style default Array.sort)
e2e: array_static_dynamic … OK (dynamic Array.isArray/from)
e2e: array_to_reversed … OK (Array.toReversed)
e2e: array_to_sorted … OK (Array.toSorted default copy)
e2e: array_to_spliced … OK (Array.toSpliced non-mutating splice)
e2e: array_to_string … OK (Array.toString/toLocaleString)
e2e: array_value_of … OK (Array.valueOf identity)
e2e: array_with    … OK      (Array.with non-mutating replacement)
e2e: arrays        … OK
e2e: bigint        … OK      (GMP-backed BigInt arithmetic)
e2e: buffer        … OK      (binary-safe Buffer subset)
e2e: buffer_object_methods … OK (Buffer toLocaleString/valueOf)
e2e: captures      … OK      (module-level let/const used inside functions + arrows)
e2e: call_arg_order … OK     (left-to-right call argument evaluation)
e2e: class_modifiers … OK    (abstract/access/readonly modifiers)
e2e: classes       … OK
e2e: computed_props … OK    (computed object-literal keys)
e2e: console_format … OK     (console % specifiers)
e2e: crypto_sha256 … OK      (sha256 hex hashing)
e2e: custom_predicates … OK  (user-defined type predicate narrowing)
e2e: custom_iterator_object … OK (class iterator object with next())
e2e: discriminated_unions … OK (basic discriminated-union narrowing)
e2e: dynamic_coercions … OK  (any/unknown unbox into typed destinations)
e2e: dynamic_index_assignment … OK (dynamic array index writes)
e2e: dynamic_last_index_of … OK (dynamic string/array lastIndexOf)
e2e: dynamic_array_copy_within … OK (dynamic Array.copyWithin)
e2e: dynamic_array_define_property … OK (dynamic array defineProperty)
e2e: dynamic_array_entries … OK (dynamic Array.entries)
e2e: dynamic_array_extensibility … OK (dynamic array preventExtensions/seal/freeze descriptors and mutators)
e2e: dynamic_array_fill … OK (dynamic Array.fill)
e2e: dynamic_array_find_last … OK (dynamic findLast/findLastIndex)
e2e: dynamic_array_flat … OK (dynamic Array.flat depth)
e2e: dynamic_array_flatmap … OK (dynamic flatMap inline arrows)
e2e: dynamic_array_hof … OK  (dynamic map/filter inline arrows + receiver args)
e2e: dynamic_array_hof_more … OK (dynamic forEach/some/every/find/findIndex)
e2e: dynamic_array_hof_refs … OK (dynamic array HOF named/closure callback refs + receiver args)
e2e: dynamic_array_keys_values … OK (dynamic Array.keys/values copies)
e2e: dynamic_array_methods … OK (dynamic shift/unshift/push/concat)
e2e: dynamic_array_object_enumeration … OK (dynamic array Object/Reflect enumeration)
e2e: dynamic_array_of … OK (Array.of<any> dynamic values)
e2e: dynamic_array_property_writes … OK (dynamic array string-key/length writes)
e2e: dynamic_array_reduce … OK (dynamic reduce with initial value)
e2e: dynamic_array_reduce_no_initial … OK (dynamic reduce/reduceRight without initial value)
e2e: dynamic_array_reduce_right … OK (dynamic reduceRight with initial value)
e2e: dynamic_array_slice_reverse … OK (dynamic Array.slice/reverse)
e2e: dynamic_array_sort … OK (dynamic default sort)
e2e: dynamic_array_sort_comparator … OK (dynamic Array.sort comparator)
e2e: dynamic_array_splice … OK (dynamic splice mutation/removal)
e2e: dynamic_array_at … OK (dynamic Array.at positive/negative indexes)
e2e: dynamic_array_to_reversed … OK (dynamic toReversed)
e2e: dynamic_array_to_sorted … OK (dynamic toSorted default copy)
e2e: dynamic_array_to_sorted_comparator … OK (dynamic toSorted comparator copy)
e2e: dynamic_array_to_spliced … OK (dynamic toSpliced non-mutating splice)
e2e: dynamic_array_to_string … OK (dynamic Array.toString/toLocaleString join)
e2e: dynamic_array_value_of … OK (dynamic Array.valueOf identity)
e2e: dynamic_array_with … OK (dynamic Array.with non-mutating replacement)
e2e: dynamic_methods … OK    (dynamic string/array method dispatch)
e2e: dynamic_string_match … OK (dynamic string match/matchAll)
e2e: dynamic_string_match_string … OK (dynamic string match/matchAll with string patterns)
e2e: dynamic_number_to_string … OK (dynamic Number.toString radix conversion)
e2e: dynamic_ops  … OK       (dynamic arithmetic/equality/relational/logical ops)
e2e: dynamic_property_assignment … OK (dynamic property writes and compound writes)
e2e: dynamic_property_ops … OK (dynamic in/delete property operations)
e2e: dynamic_search_positions … OK (dynamic string/array search positions)
e2e: dynamic_string_at … OK (dynamic String.at positive/negative indexes)
e2e: dynamic_string_code_point_at … OK (dynamic string codePointAt)
e2e: dynamic_string_concat … OK (dynamic string concat)
e2e: dynamic_string_locale_compare … OK (dynamic string localeCompare)
e2e: dynamic_string_normalize … OK (dynamic string normalize)
e2e: dynamic_string_object_enumeration … OK (dynamic string Object/Reflect enumeration)
e2e: dynamic_string_pad_repeat … OK (dynamic repeat/padStart/padEnd)
e2e: dynamic_string_replace … OK (dynamic string replace/replaceAll)
e2e: dynamic_string_replace_regex … OK (dynamic string RegExp replace/replaceAll)
e2e: dynamic_string_replace_regex_groups … OK (dynamic string RegExp replacement tokens)
e2e: dynamic_string_replace_string_tokens … OK (dynamic string replacement tokens)
e2e: dynamic_string_search … OK (dynamic String.search RegExp/string patterns)
e2e: dynamic_string_split … OK (dynamic string split)
e2e: dynamic_string_split_limit … OK (dynamic string split limit)
e2e: dynamic_string_split_regex … OK (dynamic string RegExp split)
e2e: dynamic_string_substr … OK (dynamic string substr)
e2e: dynamic_string_substring … OK (dynamic string substring)
e2e: dynamic_string_trim_edges … OK (dynamic trimStart/trimEnd)
e2e: dynamic_require … OK    (expected AOT-limit diagnostic)
e2e: enums         … OK      (numeric enum constants)
e2e: exceptions    … OK
e2e: fizzbuzz      … OK
e2e: fn_refs       … OK      (named function references as HOF callbacks)
e2e: fs_roundtrip  … OK
e2e: generic_classes … OK (erased generic class fields/methods)
e2e: generic_function_values … OK (generic functions as concrete function values)
e2e: global_number_predicates … OK (global isNaN/isFinite coercion)
e2e: greet         … OK
e2e: hello         … OK
e2e: in_operator_narrowing … OK (in-operator narrowing and typed field checks)
e2e: inheritance   … OK
e2e: instanceof    … OK      (class ancestry checks)
e2e: interfaces    … OK
e2e: json          … OK
e2e: map_set       … OK
e2e: map_set_constructors … OK (Map/Set typed constructor initialization)
e2e: map_set_for_each … OK (Map/Set forEach inline callbacks)
e2e: map_set_for_each_refs … OK (Map/Set forEach named callback refs)
e2e: map_set_for_of … OK    (direct Map/Set for-of)
e2e: map_set_same_value_zero … OK (Map/Set SameValueZero numeric keys)
e2e: math          … OK
e2e: math_constants_more … OK (Math.SQRT1_2 plus trunc/sign coverage)
e2e: math_int32_float … OK (Math.imul/clz32/fround)
e2e: math_more … OK (additional libm-backed Math methods, including variadic hypot and inverse trig)
e2e: modules       … OK      (multi-file imports)
e2e: native_addon  … OK      (expected AOT-limit diagnostic)
e2e: native_addon_package … OK (expected native package diagnostic)
e2e: namespaces    … OK      (namespace-scoped values and functions)
e2e: nullish       … OK      (?. and ??)
e2e: number_constants … OK (Number static constants)
e2e: number_constructor … OK (callable Number coercion)
e2e: number_static_more … OK (Number.is* predicates and parseInt/parseFloat radix/coercion behavior)
e2e: number_to_exponential … OK (Number.toExponential typed and dynamic formatting)
e2e: number_to_fixed … OK (Number.toFixed typed and dynamic formatting)
e2e: number_to_precision … OK (Number.toPrecision typed and dynamic formatting)
e2e: object_accessor_arrows … OK (dynamic lifted-arrow accessor descriptors)
e2e: object_accessor_closures … OK (dynamic closure-valued accessor descriptors)
e2e: object_accessors … OK   (dynamic named-function/lifted-arrow accessor descriptors)
e2e: object_array_enumeration … OK (typed array Object enumeration)
e2e: object_create_descriptors … OK (dynamic Object.create descriptor maps)
e2e: object_define_properties … OK (dynamic descriptor maps)
e2e: object_define_property … OK (dynamic data descriptors)
e2e: object_descriptor_defaults … OK (descriptor defaults and absent accessor hooks)
e2e: object_descriptor_redefine … OK (non-configurable descriptor redefinition)
e2e: object_descriptors … OK (writable/enumerable/configurable data descriptors)
e2e: object_entries … OK     (typed Object.entries/fromEntries)
e2e: dynamic_object_entries … OK (dynamic Object.entries)
e2e: dynamic_object_from_entries … OK (dynamic Object.fromEntries)
e2e: object_extensibility … OK (Object/Reflect preventExtensions/isExtensible)
e2e: object_get_own_property_descriptors … OK (dynamic Object.getOwnPropertyDescriptors)
e2e: object_has_own_property … OK (dynamic Object.prototype.hasOwnProperty)
e2e: object_is … OK (Object.is SameValue semantics)
e2e: object_is_prototype_of … OK (dynamic Object.prototype.isPrototypeOf)
e2e: object_property_is_enumerable … OK (dynamic Object.prototype.propertyIsEnumerable)
e2e: object_prototypes … OK (dynamic Object.create/getPrototypeOf/setPrototypeOf)
e2e: object_seal_freeze … OK (dynamic Object.seal/freeze state)
e2e: object_static_methods … OK (dynamic Object.assign/hasOwn/getOwnPropertyNames)
e2e: object_to_locale_string … OK (dynamic Object.prototype.toLocaleString)
e2e: object_to_string … OK (dynamic Object.prototype.toString)
e2e: object_value_of … OK (dynamic Object.prototype.valueOf)
e2e: primitive_object_methods … OK (Number/Boolean toString/toLocaleString/valueOf)
e2e: reflect_apply … OK (Reflect.apply over known functions + array args + thisArg)
e2e: reflect_construct … OK (Reflect.construct over known classes + array args)
e2e: reflect_dynamic … OK    (Reflect.get/set on dynamic objects)
e2e: reflect_get_own_property_descriptor … OK (Reflect descriptor lookup)
e2e: reflect_receiver … OK (Reflect.get/set receiver arguments + accessor this/function identity/apply)
e2e: regex         … OK      (PCRE2 regex)
e2e: regex_captures … OK     (non-global match groups)
e2e: regex_pcre2  … OK      (lookaround, named syntax, Unicode properties)
e2e: regexp_exec … OK (RegExp.exec capture arrays)
e2e: regexp_extra_flags … OK (RegExp hasIndices/sticky flags)
e2e: regexp_object_methods … OK (RegExp properties/toString/valueOf)
e2e: collection_object_methods … OK (collection toString/toLocaleString/valueOf)
e2e: release_build … OK     (--release uses size-optimized linking)
e2e: rest_spread   … OK      (rest params + spread calls)
e2e: runtime_eval  … OK      (expected AOT-limit diagnostic)
e2e: runtime_function_constructor … OK (expected AOT-limit diagnostic)
e2e: set_keys      … OK      (Set.keys alias for values)
e2e: stdlib_os     … OK
e2e: string_at     … OK      (String.at positive/negative indexes)
e2e: string_boolean_constructors … OK (callable String/Boolean coercion)
e2e: string_char_code_at … OK (String.charCodeAt UTF-16 code units)
e2e: string_codepoints … OK  (fromCharCode + codePointAt)
e2e: string_concat … OK      (String.concat)
e2e: string_for_of … OK      (Unicode string iteration)
e2e: string_from_code_point … OK (String.fromCodePoint)
e2e: string_last_index_of … OK (String.lastIndexOf)
e2e: string_locale_compare … OK (String.localeCompare)
e2e: string_match_all … OK   (matchAll capture groups)
e2e: string_match_string … OK (String.match/matchAll with string patterns)
e2e: string_normalize … OK   (ICU Unicode normalization)
e2e: string_object_enumeration … OK (typed string Object/Reflect enumeration)
e2e: string_object_methods … OK (String toString/toLocaleString/valueOf)
e2e: string_replace_regex_groups … OK (String.replace RegExp replacement tokens)
e2e: string_replace_string_tokens … OK (String.replace string replacement tokens)
e2e: string_search_positions … OK (String search position/endPosition args)
e2e: string_search_regex … OK (String.search with RegExp)
e2e: string_search_string … OK (String.search with string patterns)
e2e: string_split_limit … OK (String.split limit)
e2e: string_substr … OK      (String.substr start/length semantics)
e2e: string_substring … OK   (substring clamp/swap semantics)
e2e: string_trim_aliases … OK (trimLeft/trimRight aliases)
e2e: string_trim_edges … OK  (trimStart/trimEnd)
e2e: string_well_formed … OK (String isWellFormed/toWellFormed)
e2e: strings       … OK
e2e: switch        … OK
e2e: switch_exhaustive … OK (finite-domain exhaustiveness)
e2e: switch_exhaustive_missing … OK (expected diagnostic)
e2e: symbol_bigint_object_methods … OK (Symbol/BigInt toLocaleString/valueOf)
e2e: symbols       … OK      (Symbol values and registry)
e2e: tagged_templates … OK (tagged template calls)
e2e: tail_calls    … OK      (self-tail recursion lowered to goto)
e2e: typed_object_has_own … OK (typed Object.hasOwn/hasOwnProperty/propertyIsEnumerable)
e2e: typed_object_methods … OK (typed Object toString/toLocaleString/valueOf)
e2e: typed_object_property_names … OK (typed Object.getOwnPropertyNames)
e2e: typed_property_descriptor … OK (typed Object/Reflect property descriptors)
e2e: typed_property_descriptors … OK (typed Object.getOwnPropertyDescriptors)
e2e: typed_reflect_get … OK (typed Reflect.get field reads)
e2e: typed_reflect_has … OK (typed Reflect.has field checks)
e2e: typed_reflect_own_keys … OK (typed Reflect.ownKeys)
e2e: typed_reflect_set … OK (typed Reflect.set field writes)
e2e: typeof        … OK      (typed typeof results)
e2e: typeof_boolean_union … OK (typeof narrowing over dynamic string/number/boolean unions)
e2e: typeof_guards … OK      (typeof checks over nullable strings)
e2e: url_object_methods … OK (URL toString/toJSON/valueOf)
e2e: url_parse     … OK      (URL parsing fields)
e2e: weak_collections … OK  (typed WeakMap/WeakSet)
e2e: weak_ref      … OK      (typed WeakRef deref)
e2e: wordcount     … OK      (real-world demo: fs+regex+Map+sort+captures)
e2e: line_directives … OK   (generated C carries TS #line markers)

251 passed, 0 failed
```

Drop `TSC2C_NO_GC=1` after `sudo apt-get install libgc-dev`; OpenSSL, ICU, GMP, and PCRE2 are still required for crypto, Unicode normalization, BigInt, and regex.

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
| `tests/e2e/cases/` | One dir per test: `in.ts` + optional support files + `expected.stdout` or `expected.exitcode` |
| `tests/e2e/run.ts` | E2E harness: compile, execute, diff |

## What's next

The plan file at `~/.claude/plans/make-a-typescript-to-floating-comet.md` sequences the remaining phases. Highest leverage:

1. **Phase 3 (NaN-boxing)** — unlocks untyped code paths, `any`/`unknown`, `JSON.parse` into objects, and the ability to compile most pure-JS npm packages.
2. **Phase 6 remainder (async/await + libuv)** — needed for real Node programs that do I/O concurrently; the current Promise support is settled/immediate only.
3. **Phase 14 (npm integration)** — walks `node_modules`, respects `package.json` `exports`, detects native addons. Depends on 3 + 6.

Phases 3 and 6 are each multi-week undertakings. Phase 14 is about a month on top of those.
