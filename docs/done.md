# Implemented features

Everything in this file compiles end-to-end to a native binary via `./bin/tsc2c file.ts -o out`. Each bullet points at the test case under `tests/e2e/cases/` that exercises it and, where useful, at the runtime symbol or emitter method that implements it.

Verify all at once: `TSC2C_NO_GC=1 bun tests/e2e/run.ts` → 146 passed.

---

## 1. Language core

### Literals
- Numeric literals — decimal, `0x`/`0o`/`0b`, underscore separators → `formatNumericLiteral` in `src/emit/index.ts`. Test: `arith`
- BigInt literals (`0n`, `0xfn`, `0o77n`, `0b101n`), `BigInt(...)`, arithmetic/comparison/equality, unary minus, compound arithmetic assignment, `typeof`, and `.toString(radix?)` backed by GMP. Test: `bigint`
- Symbol values via `Symbol(description?)`, `Symbol.for`, `Symbol.keyFor`, `Symbol.iterator`, `Symbol.asyncIterator`, `.description`, `.toString()`, equality, and `typeof`. Test: `symbols`
- String literals with full C escape handling for UTF-8 and non-BMP code points → `escapeCString` in `src/emit/cbuf.ts`. Test: `hello`, `strings`, `string_for_of`
- Template literals with `${expr}` interpolation → `emitTemplate`. Test: `greet`, `fizzbuzz`
- Tagged template calls with a `TemplateStringsArray` first parameter and fixed substitution parameters. Test: `tagged_templates`
- Boolean literals `true` / `false`. Test: `json`
- `null` / `undefined` / `NaN` / `Infinity` globals. Test: `nullish`, `stdlib_os`
- Array literals `[1, 2, 3]` with spread `[0, ...a, 6]` → `emitArrayLiteral`. Test: `advanced`
- Object literals `{ x: 1 }` matched against an interface/class shape → `emitObjectLiteral`. Test: `interfaces`
- Computed property names in typed object literals when the key resolves to a string/number literal, e.g. `{ [key]: value }`. Test: `computed_props`
- Regex literals `/pattern/flags` → `emitExpr` RegularExpressionLiteral branch. Tests: `regex`, `regex_pcre2`

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
- `typeof` in typed code — JS type string with operand side effects preserved. Nullable pointer unions such as `string | null` and `string | undefined` produce the nullish runtime result and work in equality/inequality guards. Tests: `typeof`, `typeof_guards`
- Ternary `a ? b : c`
- Nullish coalescing `??` — null-aware for pointer types. Test: `nullish`
- Optional chaining `?.` — null-aware for class fields with zero-sentinel fallback. Test: `nullish`
- Cross-type null comparison: `arr !== null`, `cls === null`
- `instanceof` for class instances across single-inheritance chains. Test: `instanceof`

### Control flow
- `if` / `else if` / `else`
- `while`, `do` / `while`
- `for (let i = 0; i < n; i++)`
- `for (const x of arr)` — also works on arrays, strings, Map/Set, typed custom iterable classes whose `[Symbol.iterator]()` returns an array-backed `IterableIterator<T>`, and custom iterator objects with `next()` returning `{ done, value }`. Tests: `arrays`, `captures`, `string_for_of`, `map_set_for_of`, `custom_iterable`, `custom_iterator_object`
- `break`, `continue`
- `switch` / `case` / `default` with correct **fall-through semantics** (empty cases merge via `||`). Test: `switch`
- Exhaustiveness diagnostics for finite-domain switches over literal unions and booleans. Tests: `switch_exhaustive`, `switch_exhaustive_missing`
- `return`, void return, typed return

---

## 2. Functions

- Top-level `function` declarations with typed params and return. Test: `greet`
- Recursion (direct)
- Top-level `const f = (...) => ...` **lifted to a static C function** — usable both as a call target and as an HOF callback. Test: `fn_refs`
- Inline arrow functions in HOF call sites (body expanded inline via GCC statement expressions). Test: `array_hof`
- Function references passed as HOF callbacks — both declared functions and lifted-arrow consts. Test: `fn_refs`
- First-class typed closures for arrow/function expressions that capture enclosing function-scope locals or parameters. Captured storage is boxed in GC-managed ref cells and closure values lower to generated `{fn, env}` structs per signature. Test: `function_closures`
- Direct calls to top-level generic functions are monomorphized per concrete call signature, with simple `T` and `T[]` annotations inside the function body. Test: `generic_functions`
- Top-level generic function references are specialized in typed array callback contexts such as `map(identity)`, `flatMap(wrap)`, `filter`, `reduce`, `forEach`, `find`/`some`/`every`, and `sort` comparators. Test: `generic_callbacks`
- Top-level generic function references are specialized when assigned to concrete function-typed values, using generated adapter closures. Test: `generic_function_values`
- Generic classes are supported with erased `tsc_value_t` type-parameter storage and typed coercion at construction/method boundaries. Test: `generic_classes`
- Generic instance and static class methods are monomorphized per concrete call signature, including inherited generic method calls with base self-casts. Test: `generic_methods`
- Left-to-right argument evaluation for function, method, constructor, console, math, path, fs write, regex, and supported string calls with side effects. Test: `call_arg_order`
- Rest parameters lower to typed arrays, and spread arguments append arrays into rest parameters in evaluation order. Test: `rest_spread`
- Direct self-tail calls in top-level functions lower to parameter temporaries plus `goto`, avoiding C stack growth for accumulator-style recursion. Test: `tail_calls`
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
- `abstract` classes, access modifiers, and `readonly` fields are accepted as TS-only modifiers. Test: `class_modifiers`
- `interface` declarations → C struct types (no runtime overhead). Test: `interfaces`
- Object literals typed against an interface/class → allocated + field-assigned. Test: `interfaces`
- Interface nesting — `interface Line { from: Point; to: Point; }`. Test: `interfaces`
- Shorthand property assignment `{ x, y }`. Test: `interfaces`
- Computed property assignment with literal or const-literal keys. Test: `computed_props`
- Numeric `enum` declarations and `Enum.Member` constants. Test: `enums`

---

## 4. Collections

### Arrays
- Literal construction with optional `...spread`. Test: `advanced`
- Index access `arr[i]` (get and set) via `TSC_ARR(T, arr, i)` macro
- `.length` → `tsc_array_length`
- `.push(...)` / `.pop()` — `tsc_array_push_raw`, `tsc_array_pop_raw`
- `.shift()` / `.unshift(...)` — `tsc_array_shift_raw`, `tsc_array_unshift_raw`
- `.reverse()` — in-place via `tsc_array_reverse`
- `.toReversed()` — copy via `tsc_array_to_reversed`; original array remains unchanged. Test: `array_to_reversed`
- `.fill(value, start?, end?)` — in-place via `tsc_array_fill`. Test: `array_fill`
- `.copyWithin(target, start, end?)` — in-place via `tsc_array_copy_within`. Test: `array_copy_within`
- `.at(index)` — positive and negative index lookup. Test: `array_at`
- `.with(index, value)` — copy via `tsc_array_with`; original array remains unchanged and negative indices count from the end. Test: `array_with`
- `.toSpliced(start?, deleteCount?, ...items)` — copy via `tsc_array_to_spliced`; original array remains unchanged. Test: `array_to_spliced`
- `.slice(start?, end?)` — `tsc_array_slice`
- `.concat(...arrays)` — `tsc_array_append`
- `.join(sep?)` — with type-driven element stringification
- `.indexOf(x)`, `.lastIndexOf(x)`, `.includes(x)` — with proper per-element-type equality. Test: `array_last_index_of`
- `.sort()` / `.toSorted()` — JS-style default string-conversion sort; `toSorted` returns a sorted copy. Tests: `array_sort_default`, `array_to_sorted`
- `.sort((a, b) => cmp)` / `.toSorted((a, b) => cmp)` — inline insertion sort; accepts inline arrow OR named function reference. Test: `wordcount`
- `.flat(depth)` for compile-time numeric depths and `.flatMap(cb)` for array-returning callbacks. Test: `array_flat`
- `.forEach(cb)` / `.map(cb)` / `.filter(cb)` / `.reduce(cb, init)` / `.reduceRight(cb, init)`. Tests: `array_hof`, `array_reduce_right`
- `.find(cb)` / `.findIndex(cb)` / `.findLast(cb)` / `.findLastIndex(cb)` / `.some(cb)` / `.every(cb)`. Tests: `array_hof`, `array_find_last`
- All HOFs accept **either** inline arrow **or** named function reference. Test: `fn_refs`
- `for-of` iteration. Test: `arrays`
- `Array.isArray(x)` — resolved at compile time from typed CTypes and at runtime for dynamic values. Tests: `advanced`, `array_static_dynamic`
- `Array.from(arr)` — identity copy for typed arrays and dynamic `tsc_value_t` arrays. Tests: `advanced`, `array_static_dynamic`
- `Array.of(...items)` — typed array construction, including `Array.of<any>(...)` followed by dynamic array coercion. Tests: `array_of`, `dynamic_array_of`

### `Map<K, V>`
- `new Map<K, V>()` — `tsc_map_new(sizeof(K), sizeof(V), keyKind, 0)`
- `.set(k, v)`, `.get(k)`, `.has(k)`, `.delete(k)`, `.clear()`. Test: `map_set`
- `.keys()`, `.values()` — returns typed array
- Direct `for...of` with `[key, value]` destructuring. Test: `map_set_for_of`
- `.size` property. Test: `map_set`, `wordcount`
- Key equality polymorphic by tag: number / string / bool / pointer. Runtime: `key_eq`

### `Set<T>`
- `new Set<T>()` — `tsc_set_new(sizeof(T), keyKind, 0)`
- `.add(v)`, `.has(v)`, `.delete(v)`, `.clear()`, `.values()`, `.size`. Test: `map_set`
- Direct `for...of` over values. Test: `map_set_for_of`

### `WeakMap<K, V>` / `WeakSet<T>`
- Typed object-key `WeakMap` supports `.set(k, v)`, `.get(k)`, `.has(k)`, and `.delete(k)`. Test: `weak_collections`
- Typed object-key `WeakSet` supports `.add(v)`, `.has(v)`, and `.delete(v)`. Test: `weak_collections`
- Runtime storage reuses pointer-key map/set tables; there is no iteration API exposed.

### `WeakRef<T>`
- `new WeakRef(target)` creates a typed weak-reference wrapper, and `.deref()` returns `T | undefined`. Test: `weak_ref`
- Runtime storage is a small pointer wrapper; `FinalizationRegistry` remains separate because it needs observable GC callback scheduling.

---

## 5. Strings

All methods on the `String` interface map to `tsc_str_*` runtime calls:

- `.length` → `tsc_str_length`
- `.charAt(i)` → `tsc_str_char_at`
- `.at(i)` → `tsc_str_at`, including negative-index lookup. Test: `string_at`
- `.codePointAt(i)` → `tsc_str_code_point_at`. Test: `string_codepoints`
- `String.fromCharCode(...)` → `tsc_str_from_char_code_n`. Test: `string_codepoints`
- `.indexOf(needle)` / `.lastIndexOf(needle)` → `tsc_str_index_of`, `tsc_str_last_index_of`. Test: `string_last_index_of`
- `.localeCompare(other)` → `tsc_str_locale_compare` using deterministic runtime string ordering. Test: `string_locale_compare`
- `.includes(needle)` → `tsc_str_includes`
- `.startsWith(p)` → `tsc_str_starts_with`
- `.endsWith(p)` → `tsc_str_ends_with`
- `.slice(start?, end?)` → `tsc_str_slice`
- `.substring(start, end?)` → `tsc_str_substring`, including clamp/swap semantics. Test: `string_substring`
- `.toUpperCase()` / `.toLowerCase()` → `tsc_str_to_upper`, `tsc_str_to_lower`
- `.normalize(form?)` → `tsc_str_normalize` backed by ICU for NFC/NFD/NFKC/NFKD. Test: `string_normalize`
- `.trim()` / `.trimStart()` / `.trimEnd()` → `tsc_str_trim`, `tsc_str_trim_start`, `tsc_str_trim_end`. Test: `string_trim_edges`
- `.repeat(n)` → `tsc_str_repeat`
- `.padStart(len, pad?)` / `.padEnd(len, pad?)` → `tsc_str_pad_start`, `tsc_str_pad_end`
- `.replace(search, repl)` → `tsc_str_replace` or `tsc_str_replace_regex` (if `search` is a RegExp)
- `.replaceAll(search, repl)` → `tsc_str_replace_all` or regex version
- `.match(regex)` → `tsc_str_match_regex`
- `.matchAll(regex)` → `tsc_str_match_all_regex`, returning `string[][]` groups. Test: `string_match_all`
- `.split(sep)` / `.split(regex)` → `tsc_str_split` / `tsc_str_split_regex`
- `.concat(...strings)` → repeated `tsc_str_concat`. Test: `string_concat`
- `for...of` over strings → `tsc_str_chars`, yielding one string per UTF-8 code point. Test: `string_for_of`
- String + anything → concat with automatic stringification
- Index access `s[i]` → same as `charAt`

Tests: `strings`, `string_at`, `string_concat`, `string_for_of`, `string_last_index_of`, `string_locale_compare`, `string_match_all`, `string_normalize`, `string_substring`, `string_trim_edges`, `wordcount`

---

## 6. Regex (PCRE2-backed)

- `/pattern/flags` literal syntax — parsed at emit time. Test: `regex`
- Flag support: `g`, `i`, `m`, `s`, `u` (global, ignore-case, multiline, dotAll, Unicode)
- PCRE2 syntax support for lookahead/lookbehind, named capture syntax, and Unicode property escapes. Test: `regex_pcre2`
- `re.test(s)` → `tsc_regexp_test`
- String-side methods with regex argument: `.replace`, `.replaceAll`, `.match`, `.split`
- Capture groups on non-global `.match()` results. Test: `regex_captures`
- `.matchAll(regex)` full-match and capture arrays. Test: `string_match_all`
- Runtime: `tsc_regexp_new`, `tsc_str_replace_regex`, `tsc_str_match_regex`, `tsc_str_match_all_regex`, `tsc_str_split_regex` (all in `runtime/tsc_runtime.c`)

---

## 7. Modules

- Multi-file compilation via `ts.createProgram` — walks `import`/`export` declarations. Test: `modules`
- `src/resolve.ts` builds the dependency graph, topo-sorts modules
- Each module's top-level statements wrapped in a static `mod_init_<moduleId>(void)` function
- `main()` calls `mod_init_*` in topological order (deps first)
- Flat symbol namespace — function/class/const names are global across the program
- Local relative imports: `import { x } from "./y"` resolves via `ts.resolveModuleName`
- Namespace declarations for scoped values, functions, lifted arrow consts, nested namespaces, and namespace member assignment. Test: `namespaces`
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
- `JSON.parse(text)` returns a NaN-boxed dynamic `tsc_value_t`, with recursive parsing for objects, arrays, strings, numbers, booleans, and null. Test: `dynamic_values`

## 9.5 Dynamic values

- `any` / `unknown` and heterogeneous unions map to `tsc_value_t`, a NaN-boxed `uint64_t` dynamic value.
- Dynamic values can hold numbers, strings, booleans, null, undefined, arrays, and object pointers.
- Dynamic array/object literals box heterogeneous fields/elements into `tsc_value_t`.
- Dynamic property and element access supports object properties, array indices, and `.length` on dynamic arrays/strings.
- Dynamic property writes (`obj.x = value`, `obj["x"] = value`) and compound writes (`+=`, `-=`, `*=`, `/=`, `%=`) lower through descriptor-aware `tsc_value_set_prop` / dynamic operator helpers. Test: `dynamic_property_assignment`
- Dynamic array index writes (`arr[i] = value`) and numeric-index compound writes extend/update `tsc_value_t` arrays, filling skipped slots with `undefined`. Test: `dynamic_index_assignment`
- Dynamic `"key" in object` and `delete object.key` / `delete object["key"]` route through descriptor-aware dynamic object lookup/deletion. Test: `dynamic_property_ops`
- `typeof` guards over `string | number` unions narrow dynamic storage back to specialized string/number reads. Test: `union_narrowing`
- Dynamic arithmetic, string concatenation, equality, relational, logical, nullish, and compound arithmetic operators dispatch through `tsc_value_*` helpers. Test: `dynamic_ops`
- Dynamic array `forEach`, `map`, `flatMap`, `filter`, `reduce`/`reduceRight` with an explicit initial value, `find`, `findIndex`, `findLast`, `findLastIndex`, `some`, and `every` work with inline expression-body callbacks over `tsc_value_t` elements. Tests: `dynamic_array_hof`, `dynamic_array_hof_more`, `dynamic_array_find_last`, `dynamic_array_reduce`, `dynamic_array_reduce_right`, `dynamic_array_flatmap`
- Dynamic array `copyWithin(target, start, end?)` mutates `tsc_value_t` arrays with overlapping-copy semantics. Test: `dynamic_array_copy_within`
- Dynamic array `fill(value, start?, end?)` mutates `tsc_value_t` arrays over the selected range. Test: `dynamic_array_fill`
- Dynamic array `at(index)` returns the element at a positive or negative index, or `undefined` when out of bounds. Test: `dynamic_array_at`
- Dynamic array `toReversed()` returns a reversed copy without mutating the receiver. Test: `dynamic_array_to_reversed`
- Dynamic array `toSorted()` returns a default string-conversion sorted copy without mutating the receiver. Test: `dynamic_array_to_sorted`
- Dynamic array `with(index, value)` returns a copy with one replaced element and leaves the receiver unchanged. Test: `dynamic_array_with`
- Dynamic array `toSpliced(start?, deleteCount?, ...items)` returns a spliced copy and leaves the receiver unchanged. Test: `dynamic_array_to_spliced`
- Dynamic array `splice(start, deleteCount?, ...items)` mutates `tsc_value_t` arrays and returns removed elements as a dynamic array. Test: `dynamic_array_splice`
- Dynamic array `sort()` mutates `tsc_value_t` arrays with JS-style default string-conversion ordering. Test: `dynamic_array_sort`
- Mixed ternary branches that can be represented dynamically, such as `array` vs `any`, are boxed to `tsc_value_t`. Test: `dynamic_array_flatmap`
- Common dynamic string/array methods dispatch at runtime for `charAt`, `includes`, `indexOf`, `lastIndexOf`, `localeCompare`, `join`, `pop`, variadic `push`, `shift`, variadic `unshift`, `at`, `concat`, `copyWithin`, `fill`, `flat`, `normalize`, `padStart`, `padEnd`, `repeat`, `replace`, `replaceAll`, `reverse`, `toReversed`, `toSorted`, `toSpliced`, `with`, `slice`, `split`, `substring`, `startsWith`, `endsWith`, `toLowerCase`, `toUpperCase`, `trim`, `trimStart`, `trimEnd`, and `toString`. Tests: `dynamic_methods`, `dynamic_array_methods`, `dynamic_array_at`, `dynamic_array_copy_within`, `dynamic_array_fill`, `dynamic_array_flat`, `dynamic_array_to_reversed`, `dynamic_array_to_sorted`, `dynamic_array_to_spliced`, `dynamic_array_with`, `dynamic_last_index_of`, `dynamic_string_at`, `dynamic_string_concat`, `dynamic_string_locale_compare`, `dynamic_string_normalize`, `dynamic_string_pad_repeat`, `dynamic_string_replace`, `dynamic_string_split`, `dynamic_string_substring`, `dynamic_string_trim_edges`
- Dynamic values can be coerced into typed `number`, `boolean`, `string`, and array destinations using runtime unbox/conversion helpers. Test: `dynamic_coercions`
- Basic discriminated unions over interface-shaped dynamic object storage work with literal discriminants and typed field reads through dynamic coercion. Test: `discriminated_unions`
- User-defined type predicate functions work for interface-shaped dynamic union values when their runtime body returns a boolean guard. Test: `custom_predicates`
- `Object.keys(dynamic)`, `Object.values(dynamic)`, and `Object.entries(dynamic)` work for enumerable dynamic object data/accessor properties; values are returned as `tsc_value_t[]` and entries as dynamic `[key, value]` arrays. Test: `dynamic_object_entries`
- `Object.fromEntries(dynamicEntries)` builds a dynamic object from dynamic `[key, value]` arrays and uses string conversion for keys. Test: `dynamic_object_from_entries`
- `Object.is(a, b)` uses SameValue semantics over boxed dynamic values, including `NaN`, signed zero, strings, and object identity. Test: `object_is`
- `Object.assign(dynamicTarget, ...dynamicSources)` copies enumerable dynamic object data properties, and `Object.getOwnPropertyNames(dynamic)` / `Object.hasOwn(dynamic, key)` use the dynamic object property table. Test: `object_static_methods`
- `dynamicObj.hasOwnProperty(key)` checks the dynamic object's own property table without walking prototypes. Test: `object_has_own_property`
- `dynamicObj.isPrototypeOf(value)` checks whether the dynamic receiver appears in another dynamic object's prototype chain. Test: `object_is_prototype_of`
- `dynamicObj.propertyIsEnumerable(key)` checks that a dynamic property is both own and enumerable, returning false for hidden, inherited, or missing keys. Test: `object_property_is_enumerable`
- `dynamicObj.toString()` / `dynamicObj.toLocaleString()` reuse dynamic string conversion, and `dynamicObj.valueOf()` returns the dynamic receiver unchanged for objects and primitives. Tests: `object_to_string`, `object_to_locale_string`, `object_value_of`
- `Object.defineProperty(dynamic, key, { value, writable, enumerable, configurable })` sets dynamic object data properties and enforces data descriptor flags for writes, key enumeration, deletion, and JSON stringify. Tests: `object_define_property`, `object_descriptors`
- `Object.defineProperty` / `Reflect.defineProperty` support named-function accessor descriptors (`get`/`set`) on dynamic objects; reads call getters, writes call setters, and enumerable accessor values flow through `Object.values`, `Object.assign`, inherited lookup, and `JSON.stringify`. Test: `object_accessors`
- `Object.create(proto)`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Reflect.getPrototypeOf`, and `Reflect.setPrototypeOf` support dynamic object prototype chains; dynamic property reads, `in`, and `Reflect.has` walk prototypes while `Object.keys`, `Reflect.ownKeys`, descriptors, and `Object.hasOwn` remain own-property based. Test: `object_prototypes`
- `Object.preventExtensions(dynamic)` / `Object.isExtensible(dynamic)` and `Reflect.preventExtensions` / `Reflect.isExtensible` track dynamic object extensibility and reject new properties after extension prevention. Test: `object_extensibility`
- `Object.seal(dynamic)`, `Object.freeze(dynamic)`, `Object.isSealed(dynamic)`, and `Object.isFrozen(dynamic)` update/enforce dynamic data descriptor configurability/writability. Test: `object_seal_freeze`
- `Object.getOwnPropertyDescriptor(dynamic, key)` returns a dynamic data descriptor object for existing dynamic properties. Test: `object_descriptors`
- `Object.getOwnPropertyDescriptors(dynamic)` returns a dynamic object whose own properties are descriptor objects for every own dynamic property, including non-enumerable data properties. Test: `object_get_own_property_descriptors`
- `Reflect.get(dynamic, key)`, `Reflect.set(dynamic, key, value)`, `Reflect.has`, `Reflect.deleteProperty`, `Reflect.ownKeys`, `Reflect.defineProperty`, `Reflect.getPrototypeOf`, `Reflect.setPrototypeOf`, and `Reflect.getOwnPropertyDescriptor` handle dynamic object data properties/prototypes. Tests: `reflect_dynamic`, `reflect_get_own_property_descriptor`, `object_prototypes`, `object_descriptors`
- `JSON.stringify(dynamic)` recurses through dynamic arrays/objects. Test: `dynamic_values`

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

### `crypto`
- `crypto.createHash("sha256").update(data).digest("hex")` backed by OpenSSL SHA-256. Test: `crypto_sha256`

### `Buffer`
- `Buffer.from(string[, "utf8" | "hex"])`, `Buffer.from(number[])`, `Buffer.alloc(size, fill?)`, `Buffer.concat(list)`, `Buffer.isBuffer(value)`.
- Buffer instances expose `.length`, numeric byte indexing/get-set, `.toString("utf8" | "hex")`, `.slice()`, `.subarray()`, and `.equals()`. Test: `buffer`

### `URL`
- `new URL(input)` parses absolute URLs with `href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, and `origin` fields. Test: `url_parse`

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
- First-argument formatting for `%s`, `%d`, `%i`, `%f`, `%o`, `%O`, `%c`, and `%%`. Test: `console_format`
- Runtime: `tsc_console_log_n`, `tsc_console_error_n`

### `Date`, `Number`, `Array`, `Object`
- `Date.now()` → `tsc_date_now` (ms since epoch)
- `Number.isInteger(n)`, `Number.isFinite(n)`, `Number.isNaN(n)`, `Number.parseFloat(s)`, `Number.parseInt(s)`
- `Array.isArray(x)`, `Array.from(arr)`, `Array.of(...items)`
- `Object.keys(obj)`, `Object.values(obj)` — compile-time expanded from the type's property list
- `Object.entries(obj)`, `Object.fromEntries(entries)` — typed `[string, T]` entry arrays for homogeneous object fields. Test: `object_entries`
- Global `parseInt` / `parseFloat` / `isNaN` / `isFinite` → mapped to runtime or C math builtins

---

## 11. Diagnostics & tooling

- TypeScript type-checking via the official compiler API — any TS type error is surfaced with full source context (file:line:col + code frame) before emission. Test: try `/tmp/bad.ts` with `const x: number = "str"`.
- Unsupported-feature diagnostics include source location and a one-line reason — exit code 3 distinguishes them from TS errors (exit 2) and gcc failures (exit 1).
- Permanent AOT-limit diagnostics reject `eval`, `Function` / `new Function`, non-literal `require(variable)`, literal native addon specifiers ending in `.node`, and literal package imports/requires whose installed package root contains `build/Release/*.node`. Tests: `runtime_eval`, `runtime_function_constructor`, `dynamic_require`, `native_addon`, `native_addon_package`
- Generated C includes `#line` directives for emitted TypeScript statements so debugger and compiler locations can point back to TS source. Test: `line_directives`
- `--emit-c-only` — skip gcc, just write the generated `main.c` for inspection.
- `--keep-build-dir <path>` — keep intermediate files rather than using a tempdir.
- `--verbose` — print compile steps + the full gcc command line.
- `--no-gc` — link without Boehm GC (leaking `calloc` fallback) for environments where `libgc-dev` isn't installed.
- `--release` — link a smaller release binary using gcc `-Os -s` instead of the default `-O2`. Test: `release_build`
- OpenSSL (`libssl-dev`), ICU (`libicu-dev`), and GMP (`libgmp-dev`) are linked for crypto hashing, Unicode normalization, and BigInt.
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
| `array_copy_within` | Array.copyWithin overlapping copy |
| `array_fill` | Array.fill range mutation |
| `array_flat` | flat + flatMap on homogeneous typed arrays |
| `array_hof` | forEach/map/filter/reduce/find/some/every + inline arrows |
| `array_last_index_of` | Array.lastIndexOf |
| `array_of` | Array.of typed array construction |
| `array_sort_default` | default JS-style string-conversion sort |
| `array_static_dynamic` | dynamic Array.isArray and Array.from copy behavior |
| `array_to_reversed` | Array.toReversed non-mutating copy |
| `array_to_sorted` | Array.toSorted default non-mutating sort |
| `array_to_spliced` | Array.toSpliced non-mutating splice |
| `array_with` | Array.with non-mutating replacement |
| `bigint` | GMP-backed BigInt literals, arithmetic, comparison, and toString |
| `classes` | class + ctor + method + `this` + `new` |
| `buffer` | binary-safe Buffer construction, indexing, slicing, hex/utf8 conversion |
| `class_modifiers` | abstract/access/readonly modifiers accepted as TS-only |
| `computed_props` | computed object-literal keys resolved at compile time |
| `console_format` | first-argument console `%` specifier formatting |
| `crypto_sha256` | sha256 update + hex digest |
| `custom_iterator_object` | class `[Symbol.iterator]()` returning an iterator object with `next()` |
| `custom_predicates` | user-defined type predicate narrowing over interface-shaped union values |
| `enums` | numeric enum constants |
| `inheritance` | extends + super() + static members |
| `instanceof` | class instance ancestry checks |
| `interfaces` | interface + object literal + nested refs + shorthand |
| `exceptions` | throw + try/catch/finally + re-throw + nested |
| `modules` | multi-file import/export |
| `namespaces` | namespace-scoped values, functions, lifted arrows, and nested namespaces |
| `strings` | every supported String method |
| `math` | Math.* + constants |
| `fs_roundtrip` | fs.readFileSync + writeFileSync + path helpers |
| `function_closures` | returned closures with function-scope captures and mutable captured state |
| `generic_classes` | erased generic class fields/methods using dynamic value storage |
| `generic_function_values` | generic top-level functions assigned to concrete function-typed values |
| `line_directives` | generated C contains TS source `#line` markers |
| `map_set` | Map + Set with all methods |
| `map_set_for_of` | direct Map `[key, value]` and Set value iteration |
| `native_addon` | expected diagnostic for literal native addon imports |
| `native_addon_package` | expected diagnostic for imported packages containing native addon binaries |
| `json` | JSON.stringify of primitives, arrays, typed objects |
| `switch` | number + string switch with fall-through |
| `switch_exhaustive` | exhaustive finite-domain switch over literal unions and booleans |
| `switch_exhaustive_missing` | expected diagnostic for a missing finite-domain switch case |
| `symbols` | Symbol values, global registry, well-known symbols, typeof |
| `tagged_templates` | tagged template calls with cooked string segments |
| `tail_calls` | direct self-tail recursion lowered to a loop |
| `regex` | PCRE2-backed regex: test, replace, match, split, flags |
| `regex_captures` | capture groups for non-global `.match()` |
| `regex_pcre2` | lookahead/lookbehind, named capture syntax, Unicode properties, dotAll |
| `release_build` | `--release` size-optimized linking still produces a runnable binary |
| `rest_spread` | rest parameters and spread arguments into rest calls |
| `nullish` | `??` + `?.` + null returns from functions |
| `advanced` | spread + Object.keys + Array.from + padStart + replace |
| `object_entries` | typed Object.entries/fromEntries over homogeneous object fields |
| `object_extensibility` | dynamic Object/Reflect preventExtensions and isExtensible |
| `object_get_own_property_descriptors` | dynamic Object.getOwnPropertyDescriptors over own data descriptors |
| `object_has_own_property` | dynamic Object.prototype.hasOwnProperty over own vs inherited properties |
| `object_is` | Object.is SameValue semantics for numbers, strings, and dynamic object identity |
| `object_is_prototype_of` | dynamic Object.prototype.isPrototypeOf over prototype chains |
| `object_property_is_enumerable` | dynamic Object.prototype.propertyIsEnumerable over descriptor enumerable flags |
| `object_prototypes` | dynamic Object.create, getPrototypeOf/setPrototypeOf, and prototype-chain lookup |
| `object_seal_freeze` | dynamic Object.seal/freeze/isSealed/isFrozen |
| `object_to_locale_string` | dynamic Object.prototype.toLocaleString string conversion |
| `object_to_string` | dynamic Object.prototype.toString conversion for objects and primitives |
| `object_value_of` | dynamic Object.prototype.valueOf identity/primitive passthrough |
| `object_accessors` | dynamic named-function accessor descriptors |
| `object_define_property` | dynamic Object.defineProperty data descriptor value writes |
| `object_descriptors` | dynamic descriptor flags, getOwnPropertyDescriptor, and Reflect helpers |
| `object_static_methods` | dynamic Object.assign, Object.hasOwn, and Object.getOwnPropertyNames |
| `reflect_dynamic` | basic Reflect.get/set over dynamic object properties |
| `reflect_get_own_property_descriptor` | Reflect descriptor lookup over dynamic object data properties |
| `fn_refs` | named function refs + lifted arrow consts in HOFs |
| `call_arg_order` | left-to-right call argument evaluation with side effects |
| `captures` | module-level const/let used inside functions and arrows |
| `discriminated_unions` | literal discriminant checks over interface-shaped union values |
| `dynamic_property_assignment` | dynamic property writes and compound property writes |
| `dynamic_string_at` | dynamic String.at positive and negative index lookup |
| `dynamic_string_concat` | dynamic string concat |
| `dynamic_string_locale_compare` | dynamic string localeCompare |
| `dynamic_string_normalize` | dynamic string Unicode normalization |
| `dynamic_string_pad_repeat` | dynamic string repeat, padStart, and padEnd |
| `dynamic_string_replace` | dynamic string replace and replaceAll |
| `dynamic_string_split` | dynamic string split into dynamic arrays |
| `dynamic_string_substring` | dynamic string substring clamp/swap semantics |
| `dynamic_string_trim_edges` | dynamic string trimStart and trimEnd |
| `dynamic_require` | expected diagnostic for non-literal `require(variable)` |
| `dynamic_coercions` | `any`/`unknown` unboxing into typed number/boolean/string/array destinations |
| `dynamic_index_assignment` | dynamic array index writes and compound index writes |
| `dynamic_last_index_of` | dynamic string and array lastIndexOf |
| `array_at` | Array.at positive and negative index lookup |
| `array_find_last` | Array.findLast and Array.findLastIndex reverse callback scan |
| `array_reduce_right` | Array.reduceRight reverse accumulation with explicit initial value |
| `dynamic_array_at` | dynamic Array.at positive and negative index lookup |
| `dynamic_array_copy_within` | dynamic Array.copyWithin overlapping copy |
| `dynamic_array_fill` | dynamic Array.fill range mutation |
| `dynamic_array_flat` | dynamic Array.flat depth behavior |
| `dynamic_array_flatmap` | dynamic Array.flatMap with inline callbacks |
| `dynamic_array_find_last` | dynamic Array.findLast and findLastIndex with inline callbacks |
| `dynamic_array_hof` | dynamic Array.map/filter with inline callbacks |
| `dynamic_array_hof_more` | dynamic Array.forEach/some/every/find/findIndex with inline callbacks |
| `dynamic_array_methods` | dynamic array shift/unshift/push/concat behavior |
| `dynamic_array_of` | Array.of<any> construction followed by dynamic array coercion |
| `dynamic_array_reduce` | dynamic Array.reduce with explicit initial value |
| `dynamic_array_reduce_right` | dynamic Array.reduceRight with explicit initial value |
| `dynamic_array_sort` | dynamic Array.sort default string-conversion ordering |
| `dynamic_array_splice` | dynamic Array.splice mutation and removed-element return |
| `dynamic_array_to_reversed` | dynamic Array.toReversed non-mutating copy |
| `dynamic_array_to_sorted` | dynamic Array.toSorted default non-mutating sort |
| `dynamic_array_to_spliced` | dynamic Array.toSpliced non-mutating splice |
| `dynamic_array_with` | dynamic Array.with non-mutating replacement |
| `dynamic_methods` | runtime method dispatch for common dynamic string/array methods |
| `dynamic_object_entries` | dynamic Object.entries over enumerable data/accessor properties |
| `dynamic_object_from_entries` | dynamic Object.fromEntries from dynamic key/value pairs |
| `dynamic_ops` | dynamic arithmetic, equality, relational, logical, nullish, and compound operators |
| `dynamic_property_ops` | dynamic `in` and `delete` property operations |
| `dynamic_values` | NaN-boxed `any`/`unknown`, JSON.parse, heterogeneous arrays/objects |
| `stdlib_os` | os module + Date.now + Number.* statics |
| `runtime_eval` | expected diagnostic for `eval(...)` runtime compilation |
| `runtime_function_constructor` | expected diagnostic for the `Function` constructor |
| `string_at` | String.at positive and negative index lookup |
| `string_concat` | String.concat |
| `string_codepoints` | String.fromCharCode + codePointAt |
| `string_for_of` | Unicode string `for...of` iteration |
| `string_last_index_of` | String.lastIndexOf |
| `string_locale_compare` | String.localeCompare |
| `string_match_all` | matchAll full matches and capture groups |
| `string_normalize` | ICU-backed Unicode normalization forms |
| `string_substring` | String.substring clamp/swap semantics |
| `string_trim_edges` | String.trimStart and trimEnd |
| `typeof` | typed `typeof` results with operand side effects preserved |
| `typeof_guards` | typeof equality checks over nullable string values |
| `union_narrowing` | `typeof` narrowing over `string | number` dynamic union storage |
| `url_parse` | URL parsing fields |
| `weak_collections` | typed WeakMap/WeakSet with object keys |
| `weak_ref` | typed WeakRef construction and deref |
| `wordcount` | real-world: fs + regex + Map + sort + captures + env |
