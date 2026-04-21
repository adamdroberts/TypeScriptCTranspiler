# Changelog

All meaningful changes to `typescriptc` land here. Newest at the top.

## Unreleased

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
