# Changelog

All meaningful changes to `typescriptc` land here. Newest at the top.

## Unreleased

### Added
- Dedicated dynamic `Object.prototype.toString()` coverage for object, array, number, string, and boolean receivers.
- Dynamic `Object.prototype.toLocaleString()` and `valueOf()` support over boxed dynamic receivers.
- Dynamic `Object.prototype.isPrototypeOf(value)` support over dynamic prototype chains.
- Dynamic `Object.prototype.propertyIsEnumerable(key)` support over dynamic descriptor enumerable flags.
- Dynamic `Object.prototype.hasOwnProperty(key)` support over dynamic objects without walking prototypes.
- `Array.of(...items)` typed array construction, including `Array.of<any>(...)` values that can be coerced to dynamic arrays.
- `Array.prototype.reduceRight(...)` for typed arrays plus dynamic inline callbacks over `tsc_value_t` arrays with an explicit initial value.
- `Object.is(...)` support over boxed dynamic values with SameValue semantics for `NaN`, signed zero, strings, and object identity.
- Dynamic `Object.getOwnPropertyDescriptors(dynamic)` support for own data/accessor descriptor objects.
- `String.prototype.at(index)` for typed strings plus dynamic `tsc_value_t` string receivers.
- `Array.prototype.findLast(...)` and `findLastIndex(...)` for typed arrays plus dynamic inline callbacks over `tsc_value_t` arrays.
- `Array.prototype.at(index)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- Dynamic `Object.fromEntries(dynamicEntries)` support for dynamic `[key, value]` arrays.
- Dynamic `Object.entries(dynamic)` support over enumerable dynamic data/accessor properties.
- Dynamic named-function accessor descriptors for `Object.defineProperty` / `Reflect.defineProperty`, including getter reads, setter writes, inherited accessors, enumerable accessor values, and JSON stringify behavior.
- `Array.prototype.toSpliced(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.with(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.toSorted()` for typed arrays plus default dynamic `tsc_value_t` array receivers.
- `Array.prototype.toReversed()` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.lastIndexOf(...)` for typed arrays.
- `Array.prototype.copyWithin(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.fill(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `String.prototype.localeCompare(...)` for typed strings plus dynamic `tsc_value_t` string receivers.
- `String.prototype.lastIndexOf(...)` for typed strings.
- `String.prototype.concat(...)` for typed strings plus dynamic `tsc_value_t` string receivers.
- `String.prototype.trimStart()` and `String.prototype.trimEnd()` for typed strings plus dynamic `tsc_value_t` string receivers.
- `String.prototype.substring()` for typed strings plus dynamic `tsc_value_t` string receivers.
- Dynamic `String.prototype.normalize()` support over `tsc_value_t` string receivers.
- Dynamic `String.prototype.repeat`, `String.prototype.padStart`, and `String.prototype.padEnd` support over `tsc_value_t` string receivers.
- Dynamic `lastIndexOf` support over `tsc_value_t` string and array receivers.
- Dynamic `String.prototype.replace(string, value)` and `String.prototype.replaceAll(string, value)` support over `tsc_value_t` string receivers.
- Dynamic `String.prototype.split(string)` support over `tsc_value_t` string receivers, returning dynamic arrays.
- Dynamic default `Array.prototype.sort()` support over `tsc_value_t` arrays using JS-style string-conversion ordering.
- Dynamic `Array.prototype.splice` support over `tsc_value_t` arrays, returning removed elements and mutating the receiver.
- Dynamic array index assignment and compound numeric-index assignment for `tsc_value_t` arrays, including sparse extension with `undefined`.
- Dynamic direct property assignment and compound property assignment for `obj.x` / `obj["x"]` over `tsc_value_t` objects.
- Dynamic object prototype chains with `Object.create`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Reflect.getPrototypeOf`, `Reflect.setPrototypeOf`, and prototype-walking property reads / `in` / `Reflect.has`.
- Dynamic `Reflect.getOwnPropertyDescriptor(dynamic, key)` support for descriptor lookup over dynamic object data properties.
- Dynamic `Object.seal`, `Object.freeze`, `Object.isSealed`, and `Object.isFrozen` support over dynamic data descriptors.
- Dynamic object extensibility tracking with `Object.preventExtensions`, `Object.isExtensible`, `Reflect.preventExtensions`, and `Reflect.isExtensible`, enforced for new data-property writes/definitions.
- Dynamic array `flatMap` support for inline expression-body callbacks over `tsc_value_t` arrays, plus mixed dynamic ternary branch boxing.
- Dynamic array `reduce` support with an explicit initial value for inline expression-body callbacks over `tsc_value_t` arrays.
- Dynamic array `forEach`, `some`, `every`, `find`, and `findIndex` support for inline expression-body callbacks over `tsc_value_t` arrays.
- Dynamic array `map` and `filter` support for inline expression-body callbacks over `tsc_value_t` arrays.
- Dynamic `Array.prototype.flat(depth?)` support for `tsc_value_t` arrays.
- Dynamic `Array.isArray(value)` and `Array.from(value)` support for `tsc_value_t` arrays.
- Dynamic `"key" in object` and `delete object.key` / `delete object["key"]` support over descriptor-aware dynamic object properties.
- Dynamic array `shift`, variadic `unshift`, variadic `push`, and `concat` support on `tsc_value_t` arrays.
- Dynamic `Object.assign`, `Object.hasOwn`, and `Object.getOwnPropertyNames` support over dynamic object data properties.
- Dynamic object data descriptor flags for `Object.defineProperty` / `Reflect.defineProperty`, including enumerable `Object.keys`/`Object.values`/JSON behavior, non-writable `Reflect.set` failures, non-configurable `Reflect.deleteProperty` failures, `Reflect.has`, `Reflect.ownKeys`, and `Object.getOwnPropertyDescriptor`.
- Basic `Reflect.get(dynamic, key)` and `Reflect.set(dynamic, key, value)` support for dynamic object property access.
- Basic `Object.defineProperty(dynamic, key, { value })` support for dynamic object data-property writes.
- `for...of` over classes whose `[Symbol.iterator]()` returns a custom iterator object with `next()` returning `{ done, value }`.
- Generic classes now work in an erased form, storing type-parameter fields/params/returns as `tsc_value_t` and coercing at typed boundaries.
- Generic top-level function references can now be assigned to concrete function-typed values through specialized adapter closures.
- User-defined type predicate narrowing for interface-shaped dynamic union values.
- Basic discriminated-union support over interface-shaped dynamic object storage with literal discriminant checks and typed field reads through dynamic coercion.
- `tsc_value_t` unbox/coercion bridges for assigning or passing dynamic values into typed `number`, `boolean`, `string`, and array destinations.
- Runtime dispatch for common dynamic string/array methods on `tsc_value_t`, including `includes`, `indexOf`, `slice`, `join`, `push`, `pop`, casing, trim, and related helpers.
- Dynamic `tsc_value_t` binary/logical/nullish operator dispatch for arithmetic, string concatenation, equality, relational comparison, and compound arithmetic assignment.
- Phase 3 dynamic-value foundation: NaN-boxed `tsc_value_t` for `any`/`unknown`, `JSON.parse`, dynamic JSON stringify, heterogeneous dynamic arrays/objects, dynamic property/index access, and `Object.keys`/`Object.values` over dynamic objects.
- `typeof` guard narrowing over `string | number` dynamic union storage, with unbox bridges back to specialized string/number reads.
- First-class typed closures for arrow/function expressions with function-scope captures, including returned closures, mutable captured state via ref cells, closure calls, and declared-function wrapping for function-typed parameters.
- Pre-emit diagnostics now reject literal package imports/requires when the installed package root contains `build/Release/*.node`.
- `for...of` over typed custom iterable classes with `[Symbol.iterator]()` returning an array-backed `IterableIterator<T>`.
- Generic instance/static class methods are monomorphized per concrete call signature, including inherited generic method calls.
- Generic top-level function references can be specialized in typed array callback contexts, including HOFs and `sort` comparators.
- Direct top-level generic function calls are monomorphized per concrete call signature, including simple `T` and `T[]` flows.
- `--release` build mode, using gcc `-Os -s`, plus a release-mode e2e case.
- Generated C `#line` directives for emitted TypeScript statements, with an e2e generated-C assertion.
- `for...of` over strings, yielding UTF-8 code point strings, plus fixed-width C escapes for non-BMP string literals.
- Pre-emit hard-error diagnostics for literal native addon imports/requires ending in `.node`.
- Pre-emit hard-error diagnostics for permanent AOT limits: `eval`, `Function` / `new Function`, and non-literal `require(variable)`.
- Typed `WeakRef<T>` construction and `.deref()` support.
- `symbol` values with `Symbol(description?)`, `Symbol.for`, `Symbol.keyFor`, `Symbol.iterator`, `Symbol.asyncIterator`, `.description`, `.toString()`, equality, and `typeof`.
- Typed `WeakMap<K, V>` and `WeakSet<T>` with object keys and the non-iterable weak-collection method surface.
- Rest parameters for user-defined functions/methods plus spread arguments into those rest parameters.
- Tagged template calls for tags with a `TemplateStringsArray` first parameter and fixed substitution parameters.
- Computed property names in typed object literals when the key resolves to a string or number literal.
- PCRE2-backed RegExp runtime with lookahead/lookbehind, named capture syntax, Unicode property escapes, `s`/`u` flags, and existing regex string APIs preserved.
- GMP-backed `bigint` support for literals, `BigInt(...)`, arithmetic/comparison/equality, `typeof`, and `.toString(radix?)`.
- Runtime-correct `typeof` equality/inequality guards for nullable pointer unions such as `string | null` and `string | undefined`.
- `Object.entries(obj)` / `Object.fromEntries(entries)` for homogeneous typed object fields using `[string, T]` entry arrays.
- `String.prototype.normalize()` for NFC/NFD/NFKC/NFKD using ICU.
- `String.prototype.matchAll(re)` as typed `string[][]` full-match and capture-group results.
- Direct self-tail-call optimization for top-level functions, lowering `return f(...)` to argument temporaries and a `goto` loop.
- Namespace declarations for scoped values/functions, lifted arrow consts, nested namespaces, and namespace member access/assignment.
- Exhaustiveness diagnostics for finite-domain switches over literal unions and booleans, plus expected-failure e2e support with `expected.exitcode`.
- Binary-safe `Buffer` subset: `from`, `alloc`, `concat`, `isBuffer`, `.length`, byte indexing/get-set, `.toString`, `.slice`/`.subarray`, and `.equals`.
- `new URL(input)` for absolute URL parsing with common readonly fields (`href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, `origin`).
- `crypto.createHash("sha256").update(...).digest("hex")` via OpenSSL-backed runtime helpers.
- Left-to-right call argument evaluation through sequenced temporaries for supported call emitters.
- `String.fromCharCode(...)` and `String.prototype.codePointAt(...)` backed by UTF-8 runtime helpers.
- Direct `for...of` iteration over `Map` entries and `Set` values.
- `instanceof` for emitted class instances using runtime class ancestry tags.
- Console first-argument formatting for common `%` specifiers.
- `Array.prototype.flat()` / `.flatMap()` for homogeneous typed arrays.
- Numeric `enum` declarations and `Enum.Member` constant lowering.
- Regex capture groups on non-global `.match()` results.
- E2E coverage documenting `abstract` classes, access modifiers, and `readonly` fields as accepted TS-only modifiers.
- `typeof` in typed code — returns the JS type string while preserving operand side effects.
- `Array.prototype.sort()` with no comparator — defaults to JS-style string-conversion ordering.

### Added — deep documentation pass
- `docs/README.md` — documentation index routing by role/topic.
- `docs/architecture.md` — multi-pass pipeline, module graph, value model; includes Mermaid diagrams for pipeline, emission passes, module init chain, and the future dynamic-value bridge.
- `docs/cli.md` — complete CLI reference: every flag, exit code, env var; explains the `bin/tsc2c` dispatch.
- `docs/runtime-reference.md` — every `tsc_*` runtime symbol grouped by feature area, with signatures and memory semantics.
- `docs/testing.md` — how the e2e harness works, how to add a new case, debugging tips.
- `CHANGELOG.md` — this file.
- `llms.txt` — concise LLM-oriented index.
- `llms-full.txt` — single-file documentation bundle for ingestion.
- `.claude/skills/tsc2c-add-feature/SKILL.md` — repo-local agent skill for future LLMs adding a language feature.

### Added — examples (under `examples/`)
- `examples/hello.ts`, `fizzbuzz.ts` — minimal demonstrations.
- `examples/calc.ts` — CLI calculator: `process.argv`, `parseFloat`, switch fall-through, `process.exit`.
- `examples/tree.ts` — binary search tree with recursive class methods and `Node | null` fields.
- `examples/cart.ts` — interfaces, classes, `reduce`/`map`/`filter`, template literals.
- `examples/collections.ts` — every HOF, `Map`, `Set`, object literals, `padEnd`.
- `examples/wordcount.ts` — fs + regex split + `Map` counter + `Array.sort` with comparator.
- `examples/README.md` — index with run commands.

## Session 4 — real-world programming

### Added
- `Array.prototype.sort` with user comparator — inline insertion sort; accepts inline arrows or function references.
- `process.env.VAR` — maps to `getenv` via `tsc_process_env_get`.
- `process.cwd()` — `tsc_process_cwd`.
- `wordcount` e2e test — tokenize via regex, count via `Map`, sort by comparator, read env var.

## Session 3 — full functional style

### Added
- Function references as HOF callbacks. `arr.map(declaredFn)` or `arr.map(liftedArrowConst)` works as well as inline arrows.
- Top-level `const f = (x) => ...` lifts to a static C function. Usable as a call target and as an HOF callback.
- Module-level `const/let` promoted to file-scope statics. Top-level functions and lifted arrows can now read/write them as captures.
- Spread in array literals: `[0, ...a, 6]`.
- `Object.keys`/`values` on typed interfaces (compile-time expansion from the TypeScript type's property list).
- `Array.from`, `Array.isArray`.
- String methods: `padStart`, `padEnd`, `replace`/`replaceAll` with both string and regex patterns.
- RegExp via POSIX ERE (`<regex.h>`): `/pattern/flags` literals, `re.test`, `s.replace`/`.match`/`.split` with regex, flag handling for `g`/`i`/`m`, JS escape class translation (`\d`, `\D`, `\w`, `\W`, `\s`, `\S`).
- Nullish coalescing `??` — null-aware for pointer types.
- Optional chaining `?.` — null-aware property access with zero-sentinel fallback.
- `null` literal as a real runtime value: cross-type equality (`arr !== null`), coercion to any pointer type.
- Declared-type preference for identifier references — enables `const s: string | null = null; s ?? "x"` to compile.

### Fixed
- `cstr_dup` forward declaration so regex code (earlier in the file) can call it.

## Session 2 — the typed-TS core

### Added
- Phase 2a: typed arrays. Literal, indexing, `.length`, `push`/`pop`/`shift`/`unshift`, `for-of`, `reverse`, `slice`, `concat`, `join`, `indexOf`, `includes`.
- Phase 2b: classes. Fields, constructor, methods, `new`, `this`, `extends`/`super()`, static fields, static methods, inherited method dispatch.
- Phase 2c: higher-order array methods with inline arrow callbacks — `forEach`/`map`/`filter`/`reduce`/`find`/`findIndex`/`some`/`every`. Expansion via GCC statement expressions.
- Phase 2.5: interfaces emitted as C structs; object literals with typed shape; shorthand property assignment `{ x, y }`.
- Phase 4: multi-file module graph. `ts.Program` walks imports, topo-sorted, each module's top-level code wrapped in `mod_init_<id>()`, called from `main` in dependency order.
- Phase 5: exceptions. `throw`/`try`/`catch`/`finally` via setjmp/longjmp with a single global error string.
- Phase 7 (partial): `Map<K,V>` and `Set<T>` via type-erased linear-scan with key-kind tag for equality.
- Phase 7 (partial): `JSON.stringify` — type-driven, recurses through arrays and class/interface fields.
- Phase 10: sync-core Node stdlib. `fs.readFileSync`/`writeFileSync`/`existsSync`/`readdirSync`, `path.join`/`resolve`/`basename`/`dirname`/`extname`, `Math.*` (floor/ceil/round/abs/sqrt/pow/min/max/log/sin/cos/tan/atan/atan2/exp/random/trunc/sign + PI, E, LN2, LN10, LOG2E, LOG10E, SQRT2), `os.platform`/`arch`/`hostname`/`tmpdir`/`homedir`/`cpus`, `Date.now`, `Number.isInteger`/`isFinite`/`isNaN`/`parseInt`/`parseFloat`.
- Shortest round-trip number formatting (`tsc_str_from_num` probes `%.*g` precisions 1–17).
- Fall-through switch/case semantics: consecutive empty cases merge via `||`.
- `NaN`, `Infinity`, `undefined` globals.

## Session 1 — bootstrap

### Added
- Phase 0: CLI (`bin/tsc2c` → `src/cli.ts`), TypeScript compiler API integration (`src/program.ts`), emitter scaffolding (`src/emit/index.ts`), gcc driver (`src/link/cc.ts`), runtime skeleton (`runtime/tsc_runtime.c/.h`), `stdlib/lib.core.d.ts` shim replacing `@types/node`.
- Phase 1: typed core — `number`/`string`/`boolean`/`void`, literals, operators (arithmetic, comparison, logical, bitwise, assignment + compound, pre/post `++ --`), ternary, template literals, if/while/do-while/for/break/continue, top-level function declarations with recursion, `console.log`/`error`/`warn`/`info`, `process.exit`/`argv`, `parseInt`/`parseFloat`/`isNaN`/`isFinite`.
- `--no-gc` compile flag using `-DTSC_NO_GC` as a fallback for environments without `libgc-dev`.
- e2e test harness at `tests/e2e/run.ts` with `hello`, `fizzbuzz`, `arith`, `greet` cases.

## Permanent limits

Features that will never be supported, documented once and referenced from [`docs/todo.md`](docs/todo.md):

- Native C++ addons (`node_modules/*/build/Release/*.node`) — linked against Node's V8 ABI.
- Runtime code compilation (JS constructs that compile strings at runtime) — `tsc2c` is ahead-of-time.
- Dynamic `require(variable)` with a non-literal argument — can't be walked statically.

These are hard limits, not backlog items. The plan explicitly acknowledges them.
