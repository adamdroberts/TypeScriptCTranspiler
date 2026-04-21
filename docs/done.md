# Implemented features

Everything in this file compiles end-to-end to a native binary via `./bin/tsc2c file.ts -o out`. Each bullet points at the test case under `tests/e2e/cases/` that exercises it and, where useful, at the runtime symbol or emitter method that implements it.

Verify all at once: `TSC2C_NO_GC=1 bun tests/e2e/run.ts` → 24 passed.

---

## 1. Language core

### Literals
- Numeric literals — decimal, `0x`/`0o`/`0b`, underscore separators → `formatNumericLiteral` in `src/emit/index.ts`. Test: `arith`
- String literals with full C escape handling for UTF-8 → `escapeCString` in `src/emit/cbuf.ts`. Test: `hello`, `strings`
- Template literals with `${expr}` interpolation → `emitTemplate`. Test: `greet`, `fizzbuzz`
- Boolean literals `true` / `false`. Test: `json`
- `null` / `undefined` / `NaN` / `Infinity` globals. Test: `nullish`, `stdlib_os`
- Array literals `[1, 2, 3]` with spread `[0, ...a, 6]` → `emitArrayLiteral`. Test: `advanced`
- Object literals `{ x: 1 }` matched against an interface/class shape → `emitObjectLiteral`. Test: `interfaces`
- Regex literals `/pattern/flags` → `emitExpr` RegularExpressionLiteral branch. Test: `regex`

### Primitives
- `number` → C `double` with shortest round-trip formatting. Runtime: `tsc_str_from_num`
- `string` → immutable UTF-8 `tsc_str_t*`. Runtime: `tsc_str_from_lit`, `tsc_str_concat`, `tsc_str_eq`, `tsc_str_cmp`
- `boolean` → C `bool` (stdbool.h)
- `void` / `undefined` / `null` as `NULL` for pointer-typed contexts

### Operators
- Arithmetic: `+ - * / % **` (incl. `tsc_num_mod` for JS-semantics modulo, `pow` for `**`)
- Comparison: `== != === !==` (with `tsc_str_eq` for strings)
- Relational: `< <= > >=` (with `tsc_str_cmp` for strings)
- Logical: `&& || !`
- Bitwise: `& | ^ << >> >>>` (JS-style int32 semantics)
- Assignment + compound: `= += -= *= /= %=`
- Pre/post `++` `--`
- Ternary `a ? b : c`
- Nullish coalescing `??` — null-aware for pointer types. Test: `nullish`
- Optional chaining `?.` — null-aware for class fields with zero-sentinel fallback. Test: `nullish`
- Cross-type null comparison: `arr !== null`, `cls === null`

### Control flow
- `if` / `else if` / `else`
- `while`, `do` / `while`
- `for (let i = 0; i < n; i++)`
- `for (const x of arr)` — also works on `for-of` over arrays. Test: `arrays`, `captures`
- `break`, `continue`
- `switch` / `case` / `default` with correct **fall-through semantics** (empty cases merge via `||`). Test: `switch`
- `return`, void return, typed return

---

## 2. Functions

- Top-level `function` declarations with typed params and return. Test: `greet`
- Recursion (direct)
- Top-level `const f = (...) => ...` **lifted to a static C function** — usable both as a call target and as an HOF callback. Test: `fn_refs`
- Inline arrow functions in HOF call sites (body expanded inline via GCC statement expressions). Test: `array_hof`
- Function references passed as HOF callbacks — both declared functions and lifted-arrow consts. Test: `fn_refs`
- Module-level `const` / `let` emitted as file-scope statics so top-level functions read/write them as captures. Test: `captures`

---

## 3. Classes & types

- `class Foo { field: T; }` — compiled to a C struct. Test: `classes`
- Constructors — `ClassName_init(self, ...)` + `ClassName_new(...)` pair. Test: `classes`
- Methods — `ClassName_methodName(self, ...)`. Test: `classes`
- `this` → `self` inside methods and ctor
- `new Foo(args)` → `Foo_new(args)`. Test: `classes`
- Field access `obj.x`, field assignment `obj.x = v`. Test: `classes`
- **Single inheritance** via `extends` — base fields laid out at struct head for safe up-cast. Test: `inheritance`
- `super(...)` call in subclass constructor → `Base_init((Base_t*)self, ...)`. Test: `inheritance`
- **Static fields** — emitted as file-scope `ClassName_field`. Test: `inheritance`
- **Static methods** — called as `ClassName_method(args)`. Test: `inheritance`
- Inherited method dispatch — `d.describe()` on `Dog extends Animal` resolves to `Animal_describe((Animal_t*)d)`. Test: `inheritance`
- `interface` declarations → C struct types (no runtime overhead). Test: `interfaces`
- Object literals typed against an interface/class → allocated + field-assigned. Test: `interfaces`
- Interface nesting — `interface Line { from: Point; to: Point; }`. Test: `interfaces`
- Shorthand property assignment `{ x, y }`. Test: `interfaces`

---

## 4. Collections

### Arrays
- Literal construction with optional `...spread`. Test: `advanced`
- Index access `arr[i]` (get and set) via `TSC_ARR(T, arr, i)` macro
- `.length` → `tsc_array_length`
- `.push(...)` / `.pop()` — `tsc_array_push_raw`, `tsc_array_pop_raw`
- `.shift()` / `.unshift(...)` — `tsc_array_shift_raw`, `tsc_array_unshift_raw`
- `.reverse()` — in-place via `tsc_array_reverse`
- `.slice(start?, end?)` — `tsc_array_slice`
- `.concat(...arrays)` — `tsc_array_append`
- `.join(sep?)` — with type-driven element stringification
- `.indexOf(x)`, `.includes(x)` — with proper per-element-type equality
- `.sort((a, b) => cmp)` — inline insertion sort; accepts inline arrow OR named function reference. Test: `wordcount`
- `.forEach(cb)` / `.map(cb)` / `.filter(cb)` / `.reduce(cb, init)`. Test: `array_hof`
- `.find(cb)` / `.findIndex(cb)` / `.some(cb)` / `.every(cb)`. Test: `array_hof`
- All HOFs accept **either** inline arrow **or** named function reference. Test: `fn_refs`
- `for-of` iteration. Test: `arrays`
- `Array.isArray(x)` — resolved at compile time from the CType. Test: `advanced`
- `Array.from(arr)` — identity copy for arrays. Test: `advanced`

### `Map<K, V>`
- `new Map<K, V>()` — `tsc_map_new(sizeof(K), sizeof(V), keyKind, 0)`
- `.set(k, v)`, `.get(k)`, `.has(k)`, `.delete(k)`, `.clear()`. Test: `map_set`
- `.keys()`, `.values()` — returns typed array
- `.size` property. Test: `map_set`, `wordcount`
- Key equality polymorphic by tag: number / string / bool / pointer. Runtime: `key_eq`

### `Set<T>`
- `new Set<T>()` — `tsc_set_new(sizeof(T), keyKind, 0)`
- `.add(v)`, `.has(v)`, `.delete(v)`, `.clear()`, `.values()`, `.size`. Test: `map_set`

---

## 5. Strings

All methods on the `String` interface map to `tsc_str_*` runtime calls:

- `.length` → `tsc_str_length`
- `.charAt(i)` → `tsc_str_char_at`
- `.indexOf(needle)` → `tsc_str_index_of`
- `.includes(needle)` → `tsc_str_includes`
- `.startsWith(p)` → `tsc_str_starts_with`
- `.endsWith(p)` → `tsc_str_ends_with`
- `.slice(start?, end?)` → `tsc_str_slice`
- `.toUpperCase()` / `.toLowerCase()` → `tsc_str_to_upper`, `tsc_str_to_lower`
- `.trim()` → `tsc_str_trim`
- `.repeat(n)` → `tsc_str_repeat`
- `.padStart(len, pad?)` / `.padEnd(len, pad?)` → `tsc_str_pad_start`, `tsc_str_pad_end`
- `.replace(search, repl)` → `tsc_str_replace` or `tsc_str_replace_regex` (if `search` is a RegExp)
- `.replaceAll(search, repl)` → `tsc_str_replace_all` or regex version
- `.match(regex)` → `tsc_str_match_regex`
- `.split(sep)` / `.split(regex)` → `tsc_str_split` / `tsc_str_split_regex`
- String + anything → concat with automatic stringification
- Index access `s[i]` → same as `charAt`

Tests: `strings`, `wordcount`

---

## 6. Regex (POSIX ERE-backed)

- `/pattern/flags` literal syntax — parsed at emit time. Test: `regex`
- Flag support: `g`, `i`, `m` (global, ignore-case, multiline)
- JS escape-class translation:
  - `\d` → `[0-9]`, `\D` → `[^0-9]`
  - `\w` → `[A-Za-z0-9_]`, `\W` → `[^A-Za-z0-9_]`
  - `\s` → `[ \t\n\r\f\v]`, `\S` → `[^ \t\n\r\f\v]`
- `re.test(s)` → `tsc_regexp_test`
- String-side methods with regex argument: `.replace`, `.replaceAll`, `.match`, `.split`
- Runtime: `tsc_regexp_new`, `tsc_str_replace_regex`, `tsc_str_match_regex`, `tsc_str_split_regex` (all in `runtime/tsc_runtime.c`)

---

## 7. Modules

- Multi-file compilation via `ts.createProgram` — walks `import`/`export` declarations. Test: `modules`
- `src/resolve.ts` builds the dependency graph, topo-sorts modules
- Each module's top-level statements wrapped in a static `mod_init_<moduleId>(void)` function
- `main()` calls `mod_init_*` in topological order (deps first)
- Flat symbol namespace — function/class/const names are global across the program
- Local relative imports: `import { x } from "./y"` resolves via `ts.resolveModuleName`
- Circular imports don't crash — topo DFS stops at the back-edge

---

## 8. Error handling

- `throw expr` — stringifies `expr` and `longjmp`s to the nearest enclosing `try`. Test: `exceptions`
- `try { } catch (e) { } finally { }` — catch binding is `tsc_str_t* e = tsc_current_error()`
- `new Error("msg")` → treated as a string carrier (simple form)
- Nested try/catch with re-throw. Test: `exceptions`
- Uncaught exceptions print `Uncaught: <msg>` and exit 1
- Runtime: `tsc_try_push`, `tsc_try_pop`, `tsc_throw_str`, `tsc_rethrow`, `tsc_current_error` + `setjmp`/`longjmp`

---

## 9. JSON

- `JSON.stringify(value)` — type-driven, recurses into:
  - Primitives (number/string/boolean) with proper JSON escaping
  - Arrays → `[...]`
  - Class/interface values → `{"field":value,...}` using the declared property list from the TypeScript checker
- Runtime: `tsc_json_escape_string`, `tsc_json_num`. Test: `json`
- **Not** implemented: `JSON.parse` (needs the dynamic value runtime)

---

## 10. Node stdlib (sync subset)

### `fs`
- `fs.readFileSync(path)` → `tsc_fs_read_file_sync`
- `fs.writeFileSync(path, data)` → `tsc_fs_write_file_sync`
- `fs.existsSync(path)` → `tsc_fs_exists_sync`
- `fs.readdirSync(path)` → `tsc_fs_readdir_sync`
- Test: `fs_roundtrip`

### `path`
- `path.join(...parts)` → `tsc_path_join`
- `path.resolve(...parts)` → `tsc_path_resolve` (against `getcwd()`)
- `path.basename` / `dirname` / `extname`
- Test: `fs_roundtrip`

### `os`
- `os.platform()` / `arch()` / `hostname()` / `tmpdir()` / `homedir()` / `cpus()`
- Runtime: `tsc_os_*`. Test: `stdlib_os`

### `Math`
- `floor`, `ceil`, `round` (JS half-to-+Inf), `abs`, `trunc`, `sign`
- `sqrt`, `pow`, `log`, `exp`, `sin`, `cos`, `tan`, `atan`, `atan2`
- `min(...)`, `max(...)` — variadic via chained `fmin`/`fmax`
- `random()` → `tsc_math_random`
- Constants: `PI`, `E`, `LN2`, `LN10`, `LOG2E`, `LOG10E`, `SQRT2`
- Test: `math`

### `process`
- `process.argv` → `tsc_process_argv` (string[] of command-line args)
- `process.env.VAR` → `tsc_process_env_get(VAR)` (getenv)
- `process.env["VAR"]` — same as above via element access
- `process.cwd()` → `tsc_process_cwd`
- `process.exit(code)` → `tsc_process_exit`
- Test: `wordcount`, `stdlib_os`

### `console`
- `console.log` / `.error` / `.warn` / `.info` — variadic, auto-stringifies each arg
- Runtime: `tsc_console_log_n`, `tsc_console_error_n`

### `Date`, `Number`, `Array`, `Object`
- `Date.now()` → `tsc_date_now` (ms since epoch)
- `Number.isInteger(n)`, `Number.isFinite(n)`, `Number.isNaN(n)`, `Number.parseFloat(s)`, `Number.parseInt(s)`
- `Array.isArray(x)`, `Array.from(arr)`
- `Object.keys(obj)`, `Object.values(obj)` — compile-time expanded from the type's property list
- Global `parseInt` / `parseFloat` / `isNaN` / `isFinite` → mapped to runtime or C math builtins

---

## 11. Diagnostics & tooling

- TypeScript type-checking via the official compiler API — any TS type error is surfaced with full source context (file:line:col + code frame) before emission. Test: try `/tmp/bad.ts` with `const x: number = "str"`.
- Unsupported-feature diagnostics include source location and a one-line reason — exit code 3 distinguishes them from TS errors (exit 2) and gcc failures (exit 1).
- `--emit-c-only` — skip gcc, just write the generated `main.c` for inspection.
- `--keep-build-dir <path>` — keep intermediate files rather than using a tempdir.
- `--verbose` — print compile steps + the full gcc command line.
- `--no-gc` — link without Boehm GC (leaking `calloc` fallback) for environments where `libgc-dev` isn't installed.
- Shortest round-trip number formatting — `tsc_str_from_num` probes `%.*g` with precision 1..17 until the formatted value strtods back to the original. Matches JS's `Number.prototype.toString` output on common cases.
- Multi-pass emission (struct fwd-decls → struct bodies → function/method protos → function/method bodies → module init bodies → main) so cycles and forward references work cleanly.

---

## Test case index

| Test case | Demonstrates |
|-----------|--------------|
| `hello` | minimal pipeline |
| `fizzbuzz` | loop + modulo + conditional + string concat |
| `arith` | all arithmetic operators + JS number formatting |
| `greet` | function declaration + template literals |
| `arrays` | array literal + push/pop + for-of + length |
| `array_hof` | forEach/map/filter/reduce/find/some/every + inline arrows |
| `classes` | class + ctor + method + `this` + `new` |
| `inheritance` | extends + super() + static members |
| `interfaces` | interface + object literal + nested refs + shorthand |
| `exceptions` | throw + try/catch/finally + re-throw + nested |
| `modules` | multi-file import/export |
| `strings` | every supported String method |
| `math` | Math.* + constants |
| `fs_roundtrip` | fs.readFileSync + writeFileSync + path helpers |
| `map_set` | Map + Set with all methods |
| `json` | JSON.stringify of primitives, arrays, typed objects |
| `switch` | number + string switch with fall-through |
| `regex` | POSIX-backed regex: test, replace, match, split, flags |
| `nullish` | `??` + `?.` + null returns from functions |
| `advanced` | spread + Object.keys + Array.from + padStart + replace |
| `fn_refs` | named function refs + lifted arrow consts in HOFs |
| `captures` | module-level const/let used inside functions and arrows |
| `stdlib_os` | os module + Date.now + Number.* statics |
| `wordcount` | real-world: fs + regex + Map + sort + captures + env |
