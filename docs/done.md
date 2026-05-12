# Implemented features

Everything in this file compiles end-to-end to a native binary via `./bin/tsc2c file.ts -o out`. Each bullet points at the test case under `tests/e2e/cases/` that exercises it and, where useful, at the runtime symbol or emitter method that implements it.

Verify all at once: `TSC2C_NO_GC=1 bun tests/e2e/run.ts` → 319 passed.

---

## 1. Language core

### Literals
- Numeric literals — decimal, `0x`/`0o`/`0b`, underscore separators → `formatNumericLiteral` in `src/emit/index.ts`. Test: `arith`
- BigInt literals (`0n`, `0xfn`, `0o77n`, `0b101n`), `BigInt(...)`, arithmetic/comparison/equality, unary minus, compound arithmetic assignment, `typeof`, `.toString(radix?)`, `.toLocaleString()`, `.valueOf()`, and inherited `hasOwnProperty` / `propertyIsEnumerable` backed by GMP. Tests: `bigint`, `symbol_bigint_object_methods`
- Symbol values via `Symbol(description?)`, `Symbol.for`, `Symbol.keyFor`, `Symbol.iterator`, `Symbol.asyncIterator`, `.description`, `.toString()`, `.toLocaleString()`, `.valueOf()`, inherited `hasOwnProperty` / `propertyIsEnumerable`, equality, and `typeof`. Tests: `symbols`, `symbol_bigint_object_methods`
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
- Callable `Number(value?)` returns JS-style numeric coercion for typed and dynamic values. Test: `number_constructor`
- Number primitives expose `.toString(radix?)`, `.toFixed(fractionDigits?)`, `.toExponential(fractionDigits?)`, `.toPrecision(precision?)`, `.toLocaleString()`, `.valueOf()`, and inherited `hasOwnProperty` / `propertyIsEnumerable`; non-decimal radix conversion uses `tsc_str_from_num_radix`, fixed-point formatting uses `tsc_str_from_num_fixed`, scientific notation uses `tsc_str_from_num_exponential`, and significant-digit formatting uses `tsc_str_from_num_precision`. Tests: `primitive_object_methods`, `number_to_fixed`, `number_to_exponential`, `number_to_precision`
- `Number.isFinite`, `Number.isNaN`, `Number.isInteger`, and `Number.isSafeInteger` accept any typed or dynamic value and return `false` for non-number inputs; global `isNaN` and `isFinite` coerce typed and dynamic values with JS-style number conversion. Tests: `number_static_more`, `global_number_predicates`
- `string` → immutable UTF-8 `tsc_str_t*`. Runtime: `tsc_str_from_lit`, `tsc_str_concat`, `tsc_str_eq`, `tsc_str_cmp`
- Callable `String(value?)` returns JS-style string coercion for typed and dynamic values. Test: `string_boolean_constructors`
- `boolean` → C `bool` (stdbool.h)
- Boolean primitives expose `.toString()`, `.toLocaleString()`, `.valueOf()`, and inherited `hasOwnProperty` / `propertyIsEnumerable`. Test: `primitive_object_methods`
- Callable `Boolean(value?)` returns JS-style truthiness for typed and dynamic values. Test: `string_boolean_constructors`
- `void` / `undefined` / `null` as `NULL` for pointer-typed contexts

### Operators
- Arithmetic: `+ - * / % **` (incl. `tsc_num_mod` for JS-semantics modulo, `pow` for `**`)
- Comparison: `== != === !==` (with `tsc_str_eq` for strings)
- Relational: `< <= > >=` (with `tsc_str_cmp` for strings)
- Logical: `&& || !`
- Bitwise: `& | ^ << >> >>>` (JS-style int32 semantics)
- Assignment + compound: `= += -= *= /= %= **= &= |= ^= <<= >>= >>>= &&= ||= ??=`; typed `string` LHS supports `+=` with any rhs through `tsc_str_concat` plus implicit string coercion, and dynamic property/index lvalues support descriptor-aware exponent/bitwise/logical assignment. Tests: `string_compound_plus`, `bitwise_assign`, `exponent_assign`, `logical_assign`, `dynamic_bitwise_ops`, `dynamic_property_logical_assign`
- Pre/post `++` `--`; local dynamic `any` variables plus dynamic property and index lvalues use JS-style numeric coercion and preserve prefix/postfix expression results. Test: `dynamic_update_ops`
- `typeof` in typed code — JS type string with operand side effects preserved. Nullable pointer unions such as `string | null` and `string | undefined` produce the nullish runtime result and work in equality/inequality guards; dynamic primitive unions such as `string | number | boolean` narrow through the existing unbox bridge. Tests: `typeof`, `typeof_guards`, `typeof_boolean_union`
- `void expr` evaluates `expr` for side effects and yields `undefined`. Test: `void_operator`
- Comma operator expressions evaluate left-to-right and return the right-hand value. Test: `comma_operator`
- Ternary `a ? b : c`
- Nullish coalescing `??` — null-aware for pointer types. Test: `nullish`
- Optional chaining `?.` — null-aware for class fields with zero-sentinel fallback. Test: `nullish`
- Cross-type null comparison: `arr !== null`, `cls === null`
- `instanceof` for class instances across single-inheritance chains. Test: `instanceof`
- `key in obj` works for dynamic objects and typed interface/class field lists, and participates in union narrowing for interface-shaped dynamic unions. Tests: `dynamic_property_ops`, `object_prototypes`, `in_operator_narrowing`

### Control flow
- `if` / `else if` / `else`
- `while`, `do` / `while`
- `for (let i = 0; i < n; i++)`
- `for (const x of arr)` — also works on arrays, strings, dynamic `tsc_value_t` arrays/strings, Map/Set, typed custom iterable classes whose `[Symbol.iterator]()` returns an array-backed `IterableIterator<T>`, custom iterable classes whose `[Symbol.iterator]()` returns a class iterator object, direct self-iterable custom iterator objects with `next()` returning `{ done, value }`, iterator classes that inherit `next()` from a base class, and custom iterators yielding `ObjectEntry<T>` values with `[key, value]` destructuring. Dynamic array-binding destructuring also supports trailing rest bindings. Tests: `arrays`, `captures`, `string_for_of`, `dynamic_for_of`, `dynamic_for_of_rest`, `map_set_for_of`, `custom_iterable`, `custom_iterator_object`, `custom_iterator_self`, `custom_iterator_inherited_next`, `custom_iterator_entry_destructure`
- Synchronous `function*` declarations with ordinary `yield expr` statements and bounded `yield*` over arrays, strings, or dynamic iterable values lower to materialized array-backed `Iterator<T>` / `IterableIterator<T>` results consumable by existing `for...of` lowering. The materialized iterator supports `.next()`, `.return(value)`, and `.throw(error)` cursor interactions. This is an eager subset; async generators and lazy suspend/resume state machines remain deferred. Test: `generator_functions`
- `for (const k in obj)` enumerates own enumerable string keys. Supports typed classes/interfaces (compile-time field-name lists), typed arrays (numeric index strings), and dynamic `tsc_value_t` objects via `tsc_value_object_keys`. The binding type is always `string`. Test: `for_in`
- `break`, `continue`
- `switch` / `case` / `default` with correct **fall-through semantics** (empty cases merge via `||`). Test: `switch`
- Exhaustiveness diagnostics for finite-domain switches over literal unions and booleans. Tests: `switch_exhaustive`, `switch_exhaustive_missing`
- `return`, void return, typed return

---

## 2. Functions

- Top-level `function` declarations with typed params and return. Test: `greet`
- Recursion (direct)
- Top-level `const f = (...) => ...` **lifted to a static C function** — usable both as a call target and as an HOF callback. Test: `fn_refs`
- Inline arrow functions in HOF call sites, including expression bodies and single-return block bodies (body expanded inline via GCC statement expressions). Test: `array_hof`
- Function references passed as HOF callbacks — both declared functions and lifted-arrow consts. Test: `fn_refs`
- First-class typed closures for arrow/function expressions that capture enclosing function-scope locals or parameters. Captured storage is boxed in GC-managed ref cells and closure values lower to generated `{fn, env}` structs per signature; calls through function-typed values support spread arguments from dynamic arrays/strings with runtime arity checks. Tests: `function_closures`, `function_value_spread`
- Direct calls to top-level generic functions are monomorphized per concrete call signature, with simple `T` and `T[]` annotations inside the function body and fixed-arity spread argument lists. Test: `generic_functions`
- Top-level generic function references are specialized in typed array callback contexts such as `map(identity)`, `flatMap(wrap)`, `filter`, `reduce`, `forEach`, `find`/`some`/`every`, and `sort` comparators. Test: `generic_callbacks`
- Top-level generic function references are specialized when assigned to concrete function-typed values, using generated adapter closures. Test: `generic_function_values`
- `Reflect.apply(fn, thisArg, args)` works for statically known function values with array-literal, array-literal-spread, typed-array, and dynamic-array argument lists; function values that declare `this: any` receive the supplied `thisArg`. Test: `reflect_apply`
- Generic classes are supported with erased `tsc_value_t` type-parameter storage and typed coercion at construction/method boundaries, including fixed-arity spread calls through erased generic class methods. Test: `generic_classes`
- Generic instance and static class methods are monomorphized per concrete call signature, including inherited generic method calls with base self-casts, literal/const-literal computed method names, and fixed-arity spread argument lists. Test: `generic_methods`
- Left-to-right argument evaluation for function, method, constructor, console, math, path, fs write, regex, and supported string calls with side effects. Test: `call_arg_order`
- Rest parameters lower to typed arrays, spread arguments append arrays into rest parameters in evaluation order, and direct fixed-arity function plus namespace/class/static method/constructor calls accept typed-array/dynamic-array/string spread argument lists with runtime arity checks. Tests: `rest_spread`, `namespaces`, `classes`, `generic_functions`, `generic_methods`
- Direct self-tail calls in top-level functions lower to parameter temporaries plus `goto`, avoiding C stack growth for accumulator-style recursion. Test: `tail_calls`
- Module-level `const` / `let` emitted as file-scope statics so top-level functions read/write them as captures. Test: `captures`

### Promise subset
- Settled `Promise<T>` values lower to `tsc_promise_t*`. `Promise.resolve(value)`, `Promise.reject(reason)`, synchronous `.then(...)`, `.catch(...)`, `.finally(...)`, and settled-array `Promise.all` / `allSettled` / `race` / `any` are implemented for compiler-known callbacks and promise arrays. This is a settled/immediate subset; async functions, pending promises, microtask ordering, timer integration, thenable assimilation, and standards-accurate empty-input combinator behavior remain deferred. Test: `promise_settled`

---

## 3. Classes & types

- `class Foo { field: T; }` — compiled to a C struct; string/number literal and const-literal computed field names are accepted. Tests: `classes`, `class_computed_members`
- Constructors — `ClassName_init(self, ...)` + `ClassName_new(...)` pair; fixed-arity constructor calls accept spread argument lists. Test: `classes`
- Methods — `ClassName_methodName(self, ...)`; string/number literal and const-literal computed method names are accepted. Tests: `classes`, `class_computed_members`
- `this` → `self` inside methods and ctor
- `new Foo(args)` / `new Foo(...args)` → `Foo_new(args)`. Test: `classes`
- `Reflect.construct(Foo, args)` works for statically known class constructors with array-literal, array-literal-spread, typed-array, and dynamic-array argument lists. Test: `reflect_construct`
- Field access `obj.x`, field assignment `obj.x = v`. Test: `classes`
- **Single inheritance** via `extends` — base fields laid out at struct head for safe up-cast. Test: `inheritance`
- `super(...)` call in subclass constructor → `Base_init((Base_t*)self, ...)`. Test: `inheritance`
- **Static fields** — emitted as file-scope `ClassName_field` storage and initialized in module init, including computed names. Tests: `inheritance`, `class_computed_members`
- **Static methods** — called as `ClassName_method(args)`, including computed names. Tests: `inheritance`, `class_computed_members`
- Inherited method dispatch — `d.describe()` on `Dog extends Animal` resolves to `Animal_describe((Animal_t*)d)`. Test: `inheritance`
- `abstract` classes, access modifiers, and `readonly` fields are accepted as TS-only modifiers. Test: `class_modifiers`
- `interface` declarations → C struct types (no runtime overhead); `extends` emits inherited fields in base-first order for field access and typed Object/Reflect field-list helpers. Tests: `interfaces`, `interface_inheritance`
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
- `.concat(...items)` — copy plus `tsc_array_append`/`tsc_array_push_raw`; accepts array arguments, single element arguments, and spread elements inside array-literal arguments. Test: `array_concat_values`
- `.join(sep?)` — with type-driven element stringification
- `.toString()` / `.toLocaleString()` — typed arrays reuse comma-join stringification. Test: `array_to_string`
- `.valueOf()` — returns the typed array receiver unchanged. Test: `array_value_of`
- `.keys()` / `.values()` / `.entries()` — returns a number-index array, a shallow value copy, or `[string, value]` entry arrays. Tests: `array_keys_values`, `array_entries`
- `.hasOwnProperty(key)` / `.propertyIsEnumerable(key)` plus `Object.hasOwn(array, key)`, `Reflect.has(array, key)`, and the `in` operator check typed array indexes and the non-enumerable `length` own property. Test: `array_own_properties`
- `Object.getOwnPropertyDescriptor(array, key)`, `Object.getOwnPropertyDescriptors(array)`, and `Reflect.getOwnPropertyDescriptor(array, key)` return typed array index and `length` data descriptors. Test: `array_property_descriptors`
- `Array.from(string)` — returns an array of one-code-point strings via `tsc_str_chars`. Test: `array_from_string`
- `.indexOf(x, fromIndex?)`, `.lastIndexOf(x, fromIndex?)`, `.includes(x, fromIndex?)` — with proper per-element-type equality, SameValueZero `includes(NaN)` behavior, and JS-style from-index clamping. Tests: `array_last_index_of`, `array_search_from_index`, `array_includes_same_value_zero`
- `.sort()` / `.toSorted()` — JS-style default string-conversion sort; `toSorted` returns a sorted copy. Tests: `array_sort_default`, `array_to_sorted`
- `.sort((a, b) => cmp)` / `.toSorted((a, b) => cmp)` — inline insertion sort; accepts inline expression-body and single-return block-body callbacks, named function references, and first-class closure comparator values. Tests: `wordcount`, `array_to_sorted`
- `.flat(depth)` for compile-time numeric depths and `.flatMap(cb)` for array-returning or scalar callbacks. Test: `array_flat`
- `.forEach(cb)` / `.map(cb)` / `.filter(cb)` / `.reduce(cb[, init])` / `.reduceRight(cb[, init])`; callbacks receive the standard receiver array argument and inline callbacks may use expression bodies or single-return block bodies. Tests: `array_hof`, `array_reduce_no_initial`, `array_reduce_right`
- `.find(cb)` / `.findIndex(cb)` / `.findLast(cb)` / `.findLastIndex(cb)` / `.some(cb)` / `.every(cb)`; callbacks receive the standard receiver array argument and inline callbacks may use expression bodies or single-return block bodies. Tests: `array_hof`, `array_find_last`
- All HOFs accept **either** inline arrow **or** named function reference, including direct function and closure callback values where supported. Tests: `fn_refs`, `array_hof`
- `for-of` iteration. Test: `arrays`
- `Array.isArray(x)` — resolved at compile time from typed CTypes and at runtime for dynamic values; the stdlib declaration is a type predicate so guarded `unknown` dynamic values narrow to typed array operations. Tests: `advanced`, `array_static_dynamic`, `array_is_array_narrowing`
- `Array.from(arr)` — identity copy for typed arrays and dynamic `tsc_value_t` arrays. Tests: `advanced`, `array_static_dynamic`
- `Array.from(set)` — typed Set value copy preserving insertion order. Test: `array_from_set`
- `Array.from(map)` — typed `Map<string, V>` entry materialization as `ObjectEntry<V>[]` in insertion order. Test: `array_from_map`
- `Array.from(items, mapfn)` two-argument form transforms typed arrays, typed Set sources, typed `Map<string, V>` entry sources, string code-point sequences, and boxed dynamic array/string sources into typed `U[]`, accepting inline arrow/function-expression callbacks with expression bodies or single-return block bodies, plus function references (including generic functions where the source is typed). Tests: `array_from_mapper`, `array_from_set`, `array_from_map`, `array_from_dynamic_mapper`
- `Array.of(...items)` — typed array construction, including `Array.of<any>(...)` followed by dynamic array coercion. Tests: `array_of`, `dynamic_array_of`

### `Map<K, V>`
- `new Map<K, V>()`, `new Map(Object.entries(obj))` for string-key `ObjectEntry<V>[]` sources, and `new Map(existingMap)` for typed Map sources — `tsc_map_new(sizeof(K), sizeof(V), keyKind, initialCap)`. Tests: `map_set_constructors`, `map_constructor_from_map`
- `.set(k, v)`, `.get(k)`, `.has(k)`, `.delete(k)`, `.clear()`; numeric keys use SameValueZero semantics so `NaN` matches `NaN` and `-0` matches `0`. Tests: `map_set`, `map_set_same_value_zero`
- `.keys()`, `.values()` — returns typed array; `.entries()` returns a typed `ObjectEntry<V>[]` for `Map<string, V>`. Test: `map_entries`
- `.forEach((value, key, map) => expr)` — inline expression-body or single-return block-body callbacks and named callback references over insertion order. Tests: `map_set_for_each`, `map_set_for_each_refs`
- Direct `for...of` with `[key, value]` destructuring. Test: `map_set_for_of`
- `.size` property. Test: `map_set`, `wordcount`
- `.toString()`, `.toLocaleString()`, and `.valueOf()`. Test: `collection_object_methods`
- Key equality is polymorphic by tag: SameValueZero numbers, string content, booleans, and pointers. Runtime: `key_eq`
- ES2024 static `Map.groupBy(items: T[], keyFn: (value: T, index: number) => K): Map<K, T[]>` groups a typed array into a typed `Map<K, T[]>` by the callback's return value. The callback may be an inline arrow/function expression with an expression body or single-return block body, or a function reference (including generic functions). Test: `map_group_by`

### `Set<T>`
- `new Set<T>()`, `new Set(valuesArray)`, and `new Set(existingSet)` — `tsc_set_new(sizeof(T), keyKind, initialCap)` plus per-value insertion. Tests: `map_set_constructors`, `set_constructor_from_set`
- `.add(v)`, `.has(v)`, `.delete(v)`, `.clear()`, `.keys()`, `.values()`, `.forEach((value, value2, set) => expr)`, `.size`; numeric values use SameValueZero semantics, and `forEach` accepts inline expression-body or single-return block-body callbacks and named callback references. Tests: `map_set`, `map_set_same_value_zero`, `set_keys`, `map_set_for_each`, `map_set_for_each_refs`
- Direct `for...of` over values. Test: `map_set_for_of`
- `.toString()`, `.toLocaleString()`, and `.valueOf()`. Test: `collection_object_methods`
- ES2025 set composition: `.union(other)`, `.intersection(other)`, `.difference(other)`, `.symmetricDifference(other)`, `.isSubsetOf(other)`, `.isSupersetOf(other)`, `.isDisjointFrom(other)`. The argument must be a `Set<T>` of the same element type; runtime helpers `tsc_set_union`/`tsc_set_intersection`/`tsc_set_difference`/`tsc_set_symmetric_difference`/`tsc_set_is_subset_of`/`tsc_set_is_superset_of`/`tsc_set_is_disjoint_from` honor SameValueZero element matching and insertion order. Test: `set_composition`

### `WeakMap<K, V>` / `WeakSet<T>`
- Typed object-key `WeakMap` supports `.set(k, v)`, `.get(k)`, `.has(k)`, and `.delete(k)`. Test: `weak_collections`
- Typed object-key `WeakSet` supports `.add(v)`, `.has(v)`, and `.delete(v)`. Test: `weak_collections`
- `.toString()`, `.toLocaleString()`, and `.valueOf()` on both weak collections. Test: `collection_object_methods`
- Runtime storage reuses pointer-key map/set tables; there is no iteration API exposed.

### `WeakRef<T>`
- `new WeakRef(target)` creates a typed weak-reference wrapper, and `.deref()` returns `T | undefined`. Test: `weak_ref`
- `.toString()`, `.toLocaleString()`, and `.valueOf()`. Test: `collection_object_methods`
- Runtime storage is a small pointer wrapper.

### `FinalizationRegistry<T>`
- `new FinalizationRegistry<T>(cleanupCallback)` is constructible against any cleanup-callback signature; the callback value is evaluated for side effects and discarded. Test: `finalization_registry`
- `.register(target, heldValue, unregisterToken?)` records an entry and `.unregister(unregisterToken)` removes any matching entries, returning whether anything was removed. Test: `finalization_registry`
- `.toString()` and `.toLocaleString()` return `"[object FinalizationRegistry]"`, and `.valueOf()` returns the receiver. Test: `finalization_registry`
- This AOT runtime has no GC-finalizer plumbing, so the cleanup callback is never invoked. The behavior matches WeakRef in spirit: type-correct API surface without observable garbage-collection callbacks.

---

## 5. Strings

All methods on the `String` interface map to `tsc_str_*` runtime calls:

- `.length` → `tsc_str_length`
- `.charAt(i)` → `tsc_str_char_at`
- `.charCodeAt(i)` → `tsc_str_char_code_at`, returning JS UTF-16 code units. Test: `string_char_code_at`
- `.at(i)` → `tsc_str_at`, including negative-index lookup. Test: `string_at`
- `.codePointAt(i)` → `tsc_str_code_point_at`. Test: `string_codepoints`
- `String.fromCharCode(...)` → `tsc_str_from_char_code_n`. Test: `string_codepoints`
- `String.fromCodePoint(...)` → `tsc_str_from_code_point_n`. Test: `string_from_code_point`
- `.indexOf(needle, position?)` / `.lastIndexOf(needle, position?)` → `tsc_str_index_of`, `tsc_str_last_index_of`. Tests: `string_last_index_of`, `string_search_positions`
- `.localeCompare(other)` → `tsc_str_locale_compare` using deterministic runtime string ordering. Test: `string_locale_compare`
- `.includes(needle, position?)` → `tsc_str_includes`. Test: `string_search_positions`
- `.startsWith(p, position?)` → `tsc_str_starts_with`. Test: `string_search_positions`
- `.endsWith(p, endPosition?)` → `tsc_str_ends_with`. Test: `string_search_positions`
- `.slice(start?, end?)` → `tsc_str_slice`
- `.substring(start, end?)` → `tsc_str_substring`, including clamp/swap semantics. Test: `string_substring`
- `.substr(start, length?)` → `tsc_str_substr`, including negative-start and length clamping semantics. Test: `string_substr`
- `.toUpperCase()` / `.toLowerCase()` → `tsc_str_to_upper`, `tsc_str_to_lower`
- `.toString()` / `.toLocaleString()` / `.valueOf()` return the typed string receiver unchanged, and inherited `hasOwnProperty` / `propertyIsEnumerable` report string indexes plus non-enumerable `length` ownership. Test: `string_object_methods`
- `.normalize(form?)` → `tsc_str_normalize` backed by ICU for NFC/NFD/NFKC/NFKD. Test: `string_normalize`
- Typed strings participate in `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, `Reflect.get`, `Reflect.has`, `Reflect.ownKeys`, `Reflect.getOwnPropertyDescriptor`, `Reflect.deleteProperty`, and `Reflect.set` with read-only string index descriptors plus non-enumerable `length`. Test: `string_object_enumeration`
- `.trim()` / `.trimStart()` / `.trimEnd()` plus `.trimLeft()` / `.trimRight()` aliases → `tsc_str_trim`, `tsc_str_trim_start`, `tsc_str_trim_end`. Tests: `string_trim_edges`, `string_trim_aliases`
- `.isWellFormed()` / `.toWellFormed()` → `true` / receiver identity for the runtime's validated UTF-8 string representation. Test: `string_well_formed`
- `.repeat(n)` → `tsc_str_repeat`
- `.padStart(len, pad?)` / `.padEnd(len, pad?)` → `tsc_str_pad_start`, `tsc_str_pad_end`
- `.replace(search, repl)` → `tsc_str_replace` or `tsc_str_replace_regex` (if `search` is a RegExp); string and RegExp replacement strings expand dollar, whole-match, prefix, and suffix tokens, and RegExp replacements also expand capture tokens. Tests: `string_replace_string_tokens`, `string_replace_regex_groups`
- `.replaceAll(search, repl)` → `tsc_str_replace_all` or regex version, sharing the replacement-string expansion path. Test: `string_replace_string_tokens`
- `.match(regexOrString)` → `tsc_str_match_regex`; string patterns are lowered through `RegExp(pattern)`. Test: `string_match_string`
- `.matchAll(regexOrString)` → `tsc_str_match_all_regex`, returning `string[][]` groups; string patterns are lowered through global `RegExp(pattern, "g")`. Tests: `string_match_all`, `string_match_string`
- `.search(regexOrString)` → `tsc_str_search_regex`; string patterns are lowered through `RegExp(pattern)`. Tests: `string_search_regex`, `string_search_string`
- `.split(sep, limit?)` / `.split(regex, limit?)` → `tsc_str_split` / `tsc_str_split_limit_num` / `tsc_str_split_regex` / `tsc_str_split_regex_limit_num`; RegExp separator captures are included in the output. Test: `string_split_limit`
- `.concat(...strings)` → repeated `tsc_str_concat`. Test: `string_concat`
- `for...of` over strings → `tsc_str_chars`, yielding one string per UTF-8 code point. Test: `string_for_of`
- String + anything → concat with automatic stringification
- Index access `s[i]` → same as `charAt`

Tests: `strings`, `string_at`, `string_concat`, `string_for_of`, `string_last_index_of`, `string_locale_compare`, `string_match_all`, `string_normalize`, `string_object_methods`, `string_search_regex`, `string_split_limit`, `string_substr`, `string_substring`, `string_trim_edges`, `wordcount`

---

## 6. Regex (PCRE2-backed)

- `/pattern/flags` literal syntax — parsed at emit time. Test: `regex`
- Flag support: `d`, `g`, `i`, `m`, `s`, `u`, `y` properties (`hasIndices`, global, ignore-case, multiline, dotAll, Unicode, sticky). Tests: `regexp_object_methods`, `regexp_extra_flags`
- PCRE2 syntax support for lookahead/lookbehind, named capture syntax, and Unicode property escapes. Test: `regex_pcre2`
- `re.exec(s)` → `tsc_regexp_exec`, returning the full match plus captures or `null`. Test: `regexp_exec`
- `re.test(s)` → `tsc_regexp_test`
- `re.source`, `re.flags`, `re.global`, `re.hasIndices`, `re.ignoreCase`, `re.multiline`, `re.dotAll`, `re.sticky`, `re.unicode`, `re.toString()`, `re.toLocaleString()`, and `re.valueOf()`. Tests: `regexp_object_methods`, `regexp_extra_flags`
- String-side methods with regex argument: `.replace`, `.replaceAll`, `.match`, `.search`, `.split`
- Capture groups on non-global `.match()` results. Test: `regex_captures`
- `.matchAll(regex)` full-match and capture arrays. Test: `string_match_all`
- Runtime: `tsc_regexp_new`, `tsc_regexp_exec`, `tsc_regexp_to_string`, `tsc_str_replace_regex`, `tsc_str_match_regex`, `tsc_str_match_all_regex`, `tsc_str_search_regex`, `tsc_str_split_regex`, `tsc_str_split_regex_limit_num` (all in `runtime/tsc_runtime.c`)

---

## 7. Modules

- Multi-file compilation via `ts.createProgram` — walks `import`/`export` declarations. Test: `modules`
- `src/resolve.ts` builds the dependency graph, topo-sorts modules
- Each module's top-level statements wrapped in a static `mod_init_<moduleId>(void)` function
- `main()` calls `mod_init_*` in topological order (deps first)
- Flat symbol namespace — function/class/const names are global across the program
- Local relative imports: `import { x } from "./y"` resolves via `ts.resolveModuleName`
- Namespace declarations for scoped values, functions, lifted arrow consts, nested namespaces, namespace member assignment, and fixed-arity spread calls into namespace functions. Test: `namespaces`
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
- Dynamic array literals typed as `any` support spread from dynamic arrays, dynamic/typed strings, and typed arrays, boxing spread elements into `tsc_value_t`. Test: `dynamic_array_spread`
- Dynamic property and element access supports object properties, array indices, and `.length` on dynamic arrays/strings.
- Dynamic property writes (`obj.x = value`, `obj["x"] = value`) and compound/logical writes (`+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`, `&&=`, `||=`, `??=`) lower through descriptor-aware `tsc_value_set_prop` / dynamic operator helpers with RHS short-circuiting for logical assignment. Tests: `dynamic_property_assignment`, `dynamic_property_logical_assign`, `dynamic_bitwise_ops`
- Dynamic array index writes (`arr[i] = value`) and numeric-index compound writes extend/update `tsc_value_t` arrays, filling skipped slots with `undefined`. Test: `dynamic_index_assignment`
- Dynamic `"key" in object` and `delete object.key` / `delete object["key"]` route through descriptor-aware dynamic object lookup/deletion. Test: `dynamic_property_ops`
- Dynamic arrays support string-key index writes through `arr["1"] = value` and `Reflect.set(arr, "1", value)`, `Reflect.set(arr, "length", n)` length truncation/extension, and non-configurable `length` deletion checks. Test: `dynamic_array_property_writes`
- `typeof` guards over `string | number` and `string | number | boolean` unions narrow dynamic storage back to specialized primitive reads. Tests: `union_narrowing`, `typeof_boolean_union`
- Dynamic unary numeric, update, arithmetic, string concatenation, bitwise, equality, relational, logical, nullish, and compound arithmetic/bitwise operators dispatch through `tsc_value_*` helpers. Tests: `dynamic_ops`, `dynamic_bitwise_ops`, `dynamic_unary_ops`, `dynamic_update_ops`
- Dynamic array `forEach`, `map`, `flatMap`, `filter`, `reduce`/`reduceRight`, `find`, `findIndex`, `findLast`, `findLastIndex`, `some`, and `every` work with inline expression-body or single-return block-body callbacks and named callback references over `tsc_value_t` elements; callbacks receive element, index, receiver array, and accumulator arguments where JavaScript specifies them, and named callbacks receive values coerced to their declared parameter types. Tests: `dynamic_array_hof`, `dynamic_array_hof_more`, `dynamic_array_hof_refs`, `dynamic_array_find_last`, `dynamic_array_reduce`, `dynamic_array_reduce_right`, `dynamic_array_reduce_no_initial`, `dynamic_array_flatmap`
- `for...of` over dynamic `tsc_value_t` arrays and strings materializes boxed element values and reuses the normal array loop lowering. Test: `dynamic_for_of`
- Dynamic `for...of` supports array-binding destructuring over boxed pair arrays, so `Object.entries(anyValue)` and dynamic arrays of pairs can be consumed with `[key, value]` bindings; trailing rest bindings such as `[head, ...tail]` materialize the remaining boxed values into an `any[]`/dynamic array. Tests: `dynamic_for_of_entries`, `dynamic_for_of_rest`
- Dynamic string `match(RegExp | string)` and `matchAll(RegExp | string)` return dynamic arrays of string captures/matches; string patterns are lowered through RegExp construction. Tests: `dynamic_string_match`, `dynamic_string_match_string`
- Dynamic string `search(RegExp | string)` returns the first RegExp match index and accepts string patterns through RegExp construction. Test: `dynamic_string_search`
- Dynamic string `replace(string | RegExp, value)` and `replaceAll(string | RegExp, value)` use the typed replacement runtimes while returning boxed dynamic strings; replacement strings expand dollar/match/prefix/suffix tokens, with RegExp captures supported on the regex path. Tests: `dynamic_string_replace`, `dynamic_string_replace_string_tokens`, `dynamic_string_replace_regex`, `dynamic_string_replace_regex_groups`
- Dynamic string `split(string | RegExp, limit?)` uses the typed split runtimes while returning boxed dynamic string arrays, including captured RegExp separator groups. Tests: `dynamic_string_split`, `dynamic_string_split_limit`, `dynamic_string_split_regex`
- Dynamic array `copyWithin(target, start, end?)` mutates `tsc_value_t` arrays with overlapping-copy semantics. Test: `dynamic_array_copy_within`
- Dynamic array `fill(value, start?, end?)` mutates `tsc_value_t` arrays over the selected range. Test: `dynamic_array_fill`
- Dynamic array `at(index)` returns the element at a positive or negative index, or `undefined` when out of bounds. Test: `dynamic_array_at`
- Dynamic array `toReversed()` returns a reversed copy without mutating the receiver. Test: `dynamic_array_to_reversed`
- Dynamic array `toSorted()` returns a sorted copy without mutating the receiver, using default string-conversion ordering or an inline expression-body/single-return block-body/named comparator. Tests: `dynamic_array_to_sorted`, `dynamic_array_to_sorted_comparator`
- Dynamic array `with(index, value)` returns a copy with one replaced element and leaves the receiver unchanged. Test: `dynamic_array_with`
- Dynamic array `toSpliced(start?, deleteCount?, ...items)` returns a spliced copy and leaves the receiver unchanged. Test: `dynamic_array_to_spliced`
- Dynamic array `splice(start, deleteCount?, ...items)` mutates `tsc_value_t` arrays and returns removed elements as a dynamic array. Test: `dynamic_array_splice`
- Dynamic array-literal spread boxes elements from dynamic arrays, dynamic/typed strings, and typed arrays into the produced dynamic array. Test: `dynamic_array_spread`
- Dynamic array `slice(start?, end?)` returns a shallow copied range with negative/clipped bounds, and `reverse()` mutates the receiver while returning the same array identity. Test: `dynamic_array_slice_reverse`
- Dynamic array `sort()` mutates `tsc_value_t` arrays with JS-style default string-conversion ordering or an inline expression-body/single-return block-body/named comparator. Tests: `dynamic_array_sort`, `dynamic_array_sort_comparator`
- Mixed ternary branches that can be represented dynamically, such as `array` vs `any`, are boxed to `tsc_value_t`. Test: `dynamic_array_flatmap`
- Common dynamic string/array methods dispatch at runtime for `charAt`, `charCodeAt`, `codePointAt`, `includes`, `indexOf`, `lastIndexOf`, `localeCompare`, `join`, `pop`, variadic `push`, `shift`, variadic `unshift`, `at`, `concat`, `copyWithin`, `fill`, `flat`, `keys`, `values`, `entries`, `normalize`, `padStart`, `padEnd`, `repeat`, `replace`, `replaceAll`, `reverse`, `toReversed`, `toSorted`, `toSpliced`, `with`, `slice`, `split`, `substr`, `substring`, `startsWith`, `endsWith`, `toLowerCase`, `toUpperCase`, `trim`, `trimStart`, `trimEnd`, `toString`, `toLocaleString`, and `valueOf`. Tests: `dynamic_methods`, `dynamic_array_methods`, `dynamic_array_at`, `dynamic_array_copy_within`, `dynamic_array_entries`, `dynamic_array_fill`, `dynamic_array_flat`, `dynamic_array_keys_values`, `array_includes_same_value_zero`, `dynamic_array_slice_reverse`, `dynamic_array_to_reversed`, `dynamic_array_to_sorted`, `dynamic_array_to_spliced`, `dynamic_array_to_string`, `dynamic_array_value_of`, `dynamic_array_with`, `dynamic_last_index_of`, `dynamic_string_at`, `dynamic_string_code_point_at`, `dynamic_string_concat`, `dynamic_string_locale_compare`, `dynamic_string_normalize`, `dynamic_string_pad_repeat`, `dynamic_string_replace`, `dynamic_string_split`, `dynamic_string_split_limit`, `dynamic_string_split_regex`, `dynamic_string_substr`, `dynamic_string_substring`, `dynamic_string_trim_edges`
- Dynamic number receivers support `.toString(radix?)` through `tsc_value_method_to_string`, plus `.toFixed(fractionDigits?)`, `.toExponential(fractionDigits?)`, and `.toPrecision(precision?)` through number-only runtime bridges. Tests: `dynamic_number_to_string`, `number_to_fixed`, `number_to_exponential`, `number_to_precision`
- Dynamic array `toString()` / `toLocaleString()` use comma-join stringification, including nested arrays and `null`/`undefined` empty slots. Test: `dynamic_array_to_string`
- Dynamic values can be coerced into typed `number`, `boolean`, `string`, and array destinations using runtime unbox/conversion helpers. Test: `dynamic_coercions`
- Basic discriminated unions over interface-shaped dynamic object storage work with literal discriminants and typed field reads through dynamic coercion. Test: `discriminated_unions`
- User-defined type predicate functions work for interface-shaped dynamic union values when their runtime body returns a boolean guard. Test: `custom_predicates`
- `Object.keys(dynamic)`, `Object.values(dynamic)`, and `Object.entries(dynamic)` work for enumerable dynamic object data/accessor properties; values are returned as `tsc_value_t[]` and entries as dynamic `[key, value]` arrays. Test: `dynamic_object_entries`
- `Object.assign(dynamicTarget, source)` copies enumerable properties from dynamic object sources, invoking getters, and from dynamic array/string sources via enumerable index keys. Dynamic object and array targets are supported, with array targets receiving writes through normal array property semantics. Typed interface/class targets copy matching fields from typed object sources and matching own properties from dynamic/array/string sources while preserving primitive source evaluation. Typed array targets accept typed array, typed object, string, dynamic object/array/string, and evaluated number/boolean/bigint/symbol primitive sources through typed-array-safe element assignment or primitive no-op handling, respecting prevent-extensions/seal/freeze state. Tests: `object_static_methods`, `object_assign_array_string`, `object_assign_array_target`, `object_assign_typed_target`, `object_assign_typed_array_target`
- Dynamic arrays participate in `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, `hasOwnProperty`, `propertyIsEnumerable`, `Reflect.get`, `Reflect.has`, and `Reflect.ownKeys` with numeric own keys plus non-enumerable `length`. Test: `dynamic_array_object_enumeration`
- Typed arrays participate in `Object.isExtensible`, `Object.isSealed`, `Object.isFrozen`, `Object.preventExtensions`, `Object.seal`, `Object.freeze`, `Object.defineProperty`, `Object.defineProperties`, `delete array[index]`, and typed-array-safe `Reflect.get` / `Reflect.set` / `Reflect.deleteProperty` / `Reflect.defineProperty`, sharing the runtime array extensibility/seal/freeze state used by writes, deletions, definitions, descriptor flag reporting, and core mutators such as `push`, `fill`, `reverse`, and `sort`. Test: `array_extensibility`
- Dynamic strings participate in dynamic index/property reads, `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, `propertyIsEnumerable`, `Reflect.get`, `Reflect.has`, `Reflect.ownKeys`, `Reflect.deleteProperty`, and `Reflect.set` with string index own keys plus non-enumerable `length`. Test: `dynamic_string_object_enumeration`
- `Object.fromEntries(dynamicEntries)` builds a dynamic object from dynamic `[key, value]` arrays and uses string conversion for keys. Test: `dynamic_object_from_entries`
- `Object.is(a, b)` uses SameValue semantics over boxed dynamic values, including `NaN`, signed zero, strings, and object identity. Test: `object_is`
- ES2024 static `Object.groupBy(items: T[], keyFn: (item: T, index: number) => string): unknown` groups a typed array into a null-prototype dynamic object whose string keys map to dynamic arrays of boxed items. The callback may be an inline arrow/function expression with an expression body or single-return block body, or a function reference. Elements must be types boxable into `tsc_value_t` (number, boolean, string, array, value). Test: `object_group_by`
- `Object.assign(dynamicTarget, ...dynamicSources)` copies enumerable dynamic object data properties, and `Object.getOwnPropertyNames(dynamic)` / `Object.hasOwn(dynamic, key)` use the dynamic object property table. Test: `object_static_methods`
- `dynamicObj.hasOwnProperty(key)` checks the dynamic object's own property table without walking prototypes. Test: `object_has_own_property`
- `dynamicObj.isPrototypeOf(value)` checks whether the dynamic receiver appears in another dynamic object's prototype chain. Test: `object_is_prototype_of`
- `dynamicObj.propertyIsEnumerable(key)` checks that a dynamic property is both own and enumerable, returning false for hidden, inherited, or missing keys. Test: `object_property_is_enumerable`
- `dynamicObj.toString()` / `dynamicObj.toLocaleString()` reuse dynamic string conversion, and `dynamicObj.valueOf()` returns the dynamic receiver unchanged for objects and primitives. Tests: `object_to_string`, `object_to_locale_string`, `object_value_of`
- `Object.defineProperty(dynamic, key, { value, writable, enumerable, configurable })` sets dynamic object data properties and enforces data descriptor flags for writes, key enumeration, deletion, JSON stringify, compatible non-configurable writable redefinition, configurable data/accessor descriptor kind transitions, shorthand descriptor fields, and boolean flag expressions; omitted fields preserve existing attributes during redefinition, omitted new-property `value` defaults to `undefined`, explicit undefined accessor hooks are accepted, and accessor descriptor objects expose own `get`/`set` fields as `undefined` when hooks are absent. Tests: `object_define_property`, `object_descriptors`, `object_descriptor_defaults`, `object_descriptor_redefine`, `object_descriptor_kind_transition`, `object_descriptor_shorthand`
- `Object.defineProperties(dynamic, descriptors)` applies a static descriptor-map object over dynamic targets, supporting data descriptors and named/lifted/closure-valued accessor descriptors. Test: `object_define_properties`
- `Reflect.defineProperty(dynamicArray, index, descriptor)` / `Object.defineProperty(dynamicArray, index, descriptor)` support bounded dense-array data descriptors for numeric indexes and `length`; index descriptors require writable/enumerable/configurable element flags, and `length` requires writable/non-enumerable/non-configurable flags. Test: `dynamic_array_define_property`
- Dynamic arrays track bounded `Object.preventExtensions` / `Object.seal` / `Object.freeze` state for Object/Reflect extensibility checks, index writes, dense-index definitions, index/length descriptor flag reporting, `length` writes, deletion checks, and core mutator methods such as `push`, `pop`, `fill`, and `sort`. Test: `dynamic_array_extensibility`
- `Object.defineProperty` / `Reflect.defineProperty` support named-function, module-scope lifted-arrow/function-expression, and function-scope closure-valued accessor descriptors (`get`/`set`) on dynamic objects; reads call getters, writes call setters, accessors that declare `this: any` observe the runtime receiver, closure accessors keep captured state alive, descriptor reads expose stable boxed `get`/`set` function identities plus own undefined fields for absent hooks, boxed accessor identities are callable through dynamic `Reflect.apply`, and enumerable accessor values flow through `Object.values`, `Object.assign`, inherited lookup, and `JSON.stringify`. Tests: `object_accessors`, `object_accessor_arrows`, `object_accessor_closures`, `reflect_receiver`, `object_descriptor_defaults`
- Configurable dynamic accessor redefinitions preserve omitted `get`/`set` hooks and omitted descriptor flags, while explicit `get: undefined` / `set: undefined` clears a hook. Test: `object_accessor_preserve`
- Non-configurable dynamic accessor descriptors can be compatibly redefined with the same getter/setter identities and enumerable/configurable flags; changed accessors or flags are rejected. Test: `object_accessor_redefine`
- `Object.create(proto)` and `Object.create(proto, descriptors)`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Reflect.getPrototypeOf`, and `Reflect.setPrototypeOf` support dynamic object prototype chains; dynamic property reads, `in`, and `Reflect.has` walk prototypes while `Object.keys`, `Reflect.ownKeys`, descriptors, and `Object.hasOwn` remain own-property based. Tests: `object_prototypes`, `object_create_descriptors`
- `Object.preventExtensions(dynamic)` / `Object.isExtensible(dynamic)` and `Reflect.preventExtensions` / `Reflect.isExtensible` track dynamic object extensibility and reject new properties after extension prevention. Test: `object_extensibility`
- `Object.seal(dynamic)`, `Object.freeze(dynamic)`, `Object.isSealed(dynamic)`, and `Object.isFrozen(dynamic)` update/enforce dynamic data descriptor configurability/writability. Test: `object_seal_freeze`
- `Object.isExtensible` / `Object.isSealed` / `Object.isFrozen`, `Object.preventExtensions` / `Object.seal` / `Object.freeze`, and empty own-property helpers (`Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`) accept non-string number/boolean/bigint/symbol primitives, preserving argument evaluation and returning ES non-object primitive results. Test: `object_primitive_extensibility`
- `Object.getOwnPropertyDescriptor(dynamic, key)` returns a dynamic data/accessor descriptor object for existing dynamic properties; accessor `get`/`set` fields are stable boxed function identities when present. Tests: `object_descriptors`, `reflect_receiver`
- `Object.getOwnPropertyDescriptors(dynamic)` returns a dynamic object whose own properties are descriptor objects for every own dynamic property, including non-enumerable data properties and accessor `get`/`set` identities. Test: `object_get_own_property_descriptors`
- `Reflect.get(dynamic, key, receiver?)`, `Reflect.set(dynamic, key, value, receiver?)`, `Reflect.has`, `Reflect.deleteProperty`, `Reflect.ownKeys`, `Reflect.defineProperty`, `Reflect.getPrototypeOf`, `Reflect.setPrototypeOf`, and `Reflect.getOwnPropertyDescriptor` handle dynamic object data properties/prototypes; receiver-aware dynamic `Reflect.set` writes inherited or missing writable data properties onto the receiver, accessor functions bind `this` to the get/set receiver when they declare `this: any`, descriptor reads preserve accessor function identity, and dynamic `Reflect.apply` can invoke those boxed accessor function identities with a supplied receiver. Tests: `reflect_dynamic`, `reflect_get_own_property_descriptor`, `reflect_receiver`, `object_prototypes`, `object_descriptors`
- `JSON.stringify(dynamic)` recurses through dynamic arrays/objects; object properties whose values are `undefined` or boxed function identities are omitted, while array slots still emit `null`. Tests: `dynamic_values`, `object_descriptor_defaults`

---

## 10. Node stdlib (sync subset)

### `fs`
- `fs.readFileSync(path)` → `tsc_fs_read_file_sync`
- `fs.writeFileSync(path, data)` → `tsc_fs_write_file_sync`
- `fs.existsSync(path)` → `tsc_fs_exists_sync`
- `fs.readdirSync(path)` → `tsc_fs_readdir_sync`
- `fs.statSync(path)` and immediate-settled `fs.promises.stat(path)` return a small typed `Stats` subset with `size`, `mode`, `isFile()`, `isDirectory()`, and `isSymbolicLink()`. Test: `fs_stat`
- `fs.lstatSync(path)` and immediate-settled `fs.promises.lstat(path)` return the same small typed `Stats` subset without following symlinks. Test: `fs_lstat`
- `fs.realpathSync(path)` and immediate-settled `fs.promises.realpath(path)` resolve paths through the host filesystem. Test: `fs_realpath`
- `fs.readlinkSync(path)` and immediate-settled `fs.promises.readlink(path)` read symlink targets through the host filesystem. Test: `fs_readlink`
- `fs.symlinkSync(target, path)` and immediate-settled `fs.promises.symlink(target, path)` create host filesystem symlinks. Test: `fs_symlink`
- `fs.linkSync(existingPath, newPath)` and immediate-settled `fs.promises.link(existingPath, newPath)` create host filesystem hard links. Test: `fs_link`
- `fs.mkdtempSync(prefix)` and immediate-settled `fs.promises.mkdtemp(prefix)` create temporary directories from a prefix. Test: `fs_mkdtemp`
- `fs.truncateSync(path, len?)` and immediate-settled `fs.promises.truncate(path, len?)` truncate files by path. Test: `fs_truncate`
- `fs.chmodSync(path, mode)` and immediate-settled `fs.promises.chmod(path, mode)` change numeric file modes. Test: `fs_chmod`
- `fs.mkdirSync(path)`, `unlinkSync(path)`, `rmSync(path)`, `rmdirSync(path)`, `appendFileSync(path, data)`, `copyFileSync(src, dest)`, and `renameSync(oldPath, newPath)` are implemented for path-only/string-data calls. Read/write/append accept bounded UTF-8 string or object-literal encoding options; `mkdir` accepts bounded `{ recursive: boolean }` object-literal options; and `rm` accepts bounded `{ recursive: boolean, force: boolean }` object-literal options for sync and immediate-settled promise calls. Tests: `fs_sync_mutation`, `fs_copy_rename`, `fs_append`, `fs_recursive_options`, `fs_encoding_options`
- Test: `fs_roundtrip`
- `fs.promises.readFile(path)`, `writeFile(path, data)`, `appendFile(path, data)`, `readdir(path)`, `stat(path)`, `lstat(path)`, `realpath(path)`, `readlink(path)`, `symlink(target, path)`, `link(existingPath, newPath)`, `mkdtemp(prefix)`, `truncate(path, len?)`, `chmod(path, mode)`, `access(path)`, `mkdir(path)`, `unlink(path)`, `rm(path)`, `rmdir(path)`, `copyFile(src, dest)`, and `rename(oldPath, newPath)` are implemented as an immediate-settled subset on top of the sync runtime. They return fulfilled `Promise<T>` values usable with the settled Promise `.then(...)` lowering; real libuv-backed async scheduling, broader options objects, and promise rejection conversion remain deferred. Tests: `fs_promises`, `fs_promises_import`, `fs_promises_mutation`, `fs_copy_rename`, `fs_append`, `fs_stat`, `fs_lstat`, `fs_realpath`, `fs_readlink`, `fs_symlink`, `fs_link`, `fs_mkdtemp`, `fs_truncate`, `fs_chmod`, `fs_recursive_options`, `fs_encoding_options`

### `path`
- `path.join(...parts)` → `tsc_path_join`
- `path.resolve(...parts)` → `tsc_path_resolve` (against `getcwd()`)
- `path.normalize(path)`, `path.isAbsolute(path)`, and `path.relative(from, to)` implement a bounded POSIX subset for segment cleanup, leading-slash absolute detection, and relative path construction. `path.sep` and `path.delimiter` expose POSIX constants. Named and namespace imports from `"path"` / `"node:path"` route to the same supported subset. Tests: `path_normalize`, `path_import`, `path_constants`, `path_relative`
- `path.basename` / `dirname` / `extname`
- Test: `fs_roundtrip`

### `os`
- `os.platform()` / `arch()` / `hostname()` / `tmpdir()` / `homedir()` / `cpus()`
- Runtime: `tsc_os_*`. Test: `stdlib_os`

### `crypto`
- `crypto.createHash("sha256").update(data).digest("hex")` backed by OpenSSL SHA-256. Test: `crypto_sha256`

### `EventEmitter`
- `new EventEmitter()` creates a synchronous listener registry from the global constructor, named imports from `"events"` / `"node:events"`, or namespace imports such as `events.EventEmitter`. `on`, `addListener`, `prependListener`, `once`, `prependOnceListener`, `off`, `removeListener`, `removeAllListeners`, `emit`, `listenerCount(eventName, listener?)`, `eventNames`, `setMaxListeners`, `getMaxListeners`, and module-level `listenerCount(emitter, eventName)` / `events.listenerCount(emitter, eventName)` / `setMaxListeners(count, emitter)` / `getMaxListeners(emitter)` are implemented for string event names and typed listener callbacks. Emitted arguments are boxed as dynamic values and coerced into each listener's declared parameters by generated adapters. Emitting `"error"` with no registered listener throws the first emitted argument string, duplicate `off` / `removeListener` calls remove the most recently added matching listener, and once listeners are removed before invocation so reentrant emits do not call them twice. Tests: `event_emitter`, `event_emitter_import`, `event_emitter_more`, `event_emitter_namespace`, `event_emitter_max_listeners`, `event_emitter_listener_count_filter`, `event_emitter_error_event`, `event_emitter_remove_latest`, `event_emitter_once_reentrant`

### `Buffer`
- `Buffer.from(string[, "utf8" | "hex"])`, `Buffer.from(number[])`, `Buffer.alloc(size, fill?)`, `Buffer.concat(list)`, `Buffer.isBuffer(value)`.
- Buffer instances expose `.length`, numeric byte indexing/get-set, `.toString("utf8" | "hex")`, `.slice()`, `.subarray()`, and `.equals()`. Test: `buffer`
- Buffer instances expose `.toLocaleString()` as UTF-8 text, `.valueOf()` identity, and numeric byte indexes through `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, inherited `hasOwnProperty` / `propertyIsEnumerable`, `Reflect.ownKeys`, `Reflect.getOwnPropertyDescriptor`, `Reflect.get`, `Reflect.has`, and the `in` operator; `length` remains non-own but is visible to `Reflect.get` / `Reflect.has` / `in`. Test: `buffer_object_methods`

### `URL`
- `new URL(input)` parses absolute URLs with `href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, and `origin` fields. Test: `url_parse`
- URL instances expose `.toString()`, `.toJSON()`, `.toLocaleString()`, `.valueOf()`, and empty own-property results through `Object.keys`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, inherited `hasOwnProperty` / `propertyIsEnumerable`, `Reflect.ownKeys`, and `Reflect.getOwnPropertyDescriptor`. Test: `url_object_methods`

### `Math`
- `floor`, `ceil`, `round` (JS half-to-+Inf), `abs`, `trunc`, `sign`
- `imul`, `clz32`, `fround` — JS-style 32-bit integer multiply/count-leading-zeroes and single-precision rounding
- `sqrt`, `pow`, `log`, `exp`, `sin`, `cos`, `tan`, `atan`, `atan2`
- `min(...)`, `max(...)` — variadic via chained `fmin`/`fmax`
- `random()` → `tsc_math_random`
- Constants: `PI`, `E`, `LN2`, `LN10`, `LOG2E`, `LOG10E`, `SQRT2`, `SQRT1_2`
- Tests: `math`, `math_constants_more`, `math_int32_float`

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
- `Math.*` covers the common libm/int32/fround surface: `floor`, `ceil`, `round` with negative-zero preservation, `abs`, `trunc`, `sign` with signed-zero preservation, `imul`, `clz32`, `fround`, `cbrt`, `sqrt`, `pow`, variadic `hypot(...)`, `min`/`max` with JS `NaN` propagation, `log`, `log1p`, `log2`, `log10`, `exp`, `expm1`, trigonometric/inverse-trigonometric and hyperbolic/inverse-hyperbolic functions, `atan2`, `random`, and constants. Tests: `math`, `math_more`, `math_constants_more`, `math_int32_float`
- `Number.EPSILON`, `MAX_SAFE_INTEGER`, `MAX_VALUE`, `MIN_SAFE_INTEGER`, `MIN_VALUE`, `NaN`, `NEGATIVE_INFINITY`, `POSITIVE_INFINITY`, plus `Number.isInteger(value)`, `Number.isFinite(value)`, `Number.isNaN(value)`, `Number.isSafeInteger(value)`, `Number.parseFloat(value)`, `Number.parseInt(value, radix?)` with JS-style omitted/zero radix inference and invalid-radix `NaN`. Tests: `stdlib_os`, `number_static_more`, `number_constants`
- `Array.isArray(x)`, `Array.from(arr)`, `Array.of(...items)`
- `Object.keys(obj)`, `Object.values(obj)`, and `Object.hasOwn(obj, key)` — compile-time expanded from the type's property list, with `Object.keys` preserving receiver evaluation
- `Object.keys(array)`, `Object.values(array)`, `Object.entries(array)`, `Object.getOwnPropertyNames(array)`, and `Reflect.ownKeys(array)` enumerate typed array indexes/values plus non-enumerable `length` where appropriate. Test: `object_array_enumeration`
- `Object.getOwnPropertyNames(obj)` — compile-time expanded from typed interface/class field lists while preserving receiver evaluation. Test: `typed_object_property_names`
- `Object.getOwnPropertyDescriptor(obj, key)`, `Object.getOwnPropertyDescriptors(obj)`, and `Reflect.getOwnPropertyDescriptor(obj, key)` return typed interface/class field data descriptors; `Reflect.get(obj, key)` reads typed interface/class fields as dynamic values, `Reflect.set(obj, key, value)` writes typed fields, `Reflect.has(obj, key)` checks typed field lists, and `Reflect.ownKeys(obj)` is compile-time expanded from typed field lists while preserving receiver evaluation. Tests: `typed_property_descriptor`, `typed_property_descriptors`, `typed_reflect_get`, `typed_reflect_set`, `typed_reflect_has`, `typed_reflect_own_keys`, `typed_object_property_names`
- `obj.hasOwnProperty(key)` and `obj.propertyIsEnumerable(key)` work for typed interface/class fields. Test: `typed_object_has_own`
- `obj.toString()`, `obj.toLocaleString()`, and `obj.valueOf()` fall back to Object-prototype behavior for typed interface/class values unless a class defines its own method. Test: `typed_object_methods`
- `Object.entries(obj)`, `Object.fromEntries(entries)`, and `Object.fromEntries(map)` — typed `[string, T]` entry arrays or typed `Map<string, T>` sources for homogeneous object fields. Tests: `object_entries`, `object_from_entries_map`
- `Map`, `Set`, `WeakMap`, `WeakSet`, `WeakRef`, and `FinalizationRegistry` instances expose empty own-property results through `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, inherited `hasOwnProperty` / `propertyIsEnumerable`, `Reflect.ownKeys`, and `Reflect.getOwnPropertyDescriptor`, while preserving receiver/key evaluation. Test: `collection_object_methods`
- Global `parseInt` / `parseFloat` / `isNaN` / `isFinite` → mapped to runtime or C math builtins, with global `parseInt` sharing the JS-style radix inference path and global numeric predicates coercing non-number inputs

---

## 11. Diagnostics & tooling

- TypeScript type-checking via the official compiler API — any TS type error is surfaced with full source context (file:line:col + code frame) before emission. Test: try `/tmp/bad.ts` with `const x: number = "str"`.
- Unsupported-feature diagnostics include source location and a one-line reason — exit code 3 distinguishes them from TS errors (exit 2) and gcc failures (exit 1).
- Permanent AOT-limit diagnostics reject `eval`, `Function` / `new Function`, non-literal `require(variable)`, literal native addon specifiers ending in `.node`, and literal package imports/requires whose installed package root contains `build/Release/*.node`. Tests: `runtime_eval`, `runtime_function_call`, `runtime_function_constructor`, `dynamic_require`, `native_addon`, `native_addon_package`
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
| `array_concat_values` | Array.concat with array, single-value, and spread-in-array-literal arguments |
| `array_copy_within` | Array.copyWithin overlapping copy |
| `array_entries` | Array.entries materialized `[string, value]` arrays |
| `array_fill` | Array.fill range mutation |
| `array_flat` | flat + flatMap on homogeneous typed arrays, including scalar flatMap results |
| `array_from_map` | Array.from over typed Map<string, V> sources with and without mapper callbacks |
| `array_from_string` | Array.from over strings via string iteration |
| `array_hof` | forEach/map/filter/reduce/find/some/every + inline expression/block-body arrows and receiver callback args |
| `array_is_array_narrowing` | Array.isArray type-predicate narrowing over unknown dynamic arrays |
| `array_keys_values` | Array.keys index arrays and Array.values shallow copies |
| `array_last_index_of` | Array.lastIndexOf |
| `array_of` | Array.of typed array construction |
| `array_own_properties` | typed array own-property checks |
| `array_property_descriptors` | typed array Object/Reflect property descriptors |
| `array_reduce_no_initial` | Array.reduce/reduceRight using the first/last element as the initial accumulator |
| `array_sort_default` | default JS-style string-conversion sort |
| `array_static_dynamic` | dynamic Array.isArray and Array.from copy behavior |
| `array_to_reversed` | Array.toReversed non-mutating copy |
| `array_to_sorted` | Array.toSorted default/comparator non-mutating sort |
| `array_to_spliced` | Array.toSpliced non-mutating splice |
| `array_to_string` | Array.toString/toLocaleString typed comma-join conversion |
| `array_value_of` | Array.valueOf typed receiver identity |
| `array_with` | Array.with non-mutating replacement |
| `bigint` | GMP-backed BigInt literals, arithmetic, comparison, and toString |
| `bitwise_assign` | typed numeric bitwise compound assignments |
| `classes` | class + ctor/method + `this` + `new`, including spread constructor calls |
| `buffer` | binary-safe Buffer construction, indexing, slicing, hex/utf8 conversion |
| `buffer_object_methods` | Buffer toLocaleString/valueOf object methods |
| `class_computed_members` | literal and const-literal computed class fields/methods |
| `class_modifiers` | abstract/access/readonly modifiers accepted as TS-only |
| `collection_object_methods` | Map/Set/WeakMap/WeakSet/WeakRef toString/toLocaleString/valueOf |
| `comma_operator` | comma operator side effects and right-hand value |
| `computed_props` | computed object-literal keys resolved at compile time |
| `console_format` | first-argument console `%` specifier formatting |
| `crypto_sha256` | sha256 update + hex digest |
| `custom_iterator_entry_destructure` | custom iterator yielding ObjectEntry values with `[key, value]` destructuring |
| `custom_iterator_object` | class `[Symbol.iterator]()` returning an iterator object with `next()` |
| `custom_iterator_inherited_next` | custom iterator object whose `next()` method is inherited from a base class |
| `custom_iterator_self` | direct self-iterable custom iterator object with `next()` |
| `custom_predicates` | user-defined type predicate narrowing over interface-shaped union values |
| `enums` | numeric enum constants |
| `event_emitter` | synchronous EventEmitter listener registration, emit, once, removal, and listener counts |
| `event_emitter_error_event` | unhandled EventEmitter `"error"` emits throw while handled errors emit normally |
| `event_emitter_import` | named `EventEmitter` import from `node:events` backed by the same synchronous runtime |
| `event_emitter_listener_count_filter` | EventEmitter listenerCount optional listener identity filtering |
| `event_emitter_max_listeners` | EventEmitter get/set max listener count through instance and events module helpers |
| `event_emitter_more` | EventEmitter prepend listeners, event-name enumeration, and module-level `events.listenerCount` |
| `event_emitter_namespace` | namespace `node:events` import with `events.EventEmitter` and `events.listenerCount` |
| `event_emitter_once_reentrant` | EventEmitter once listeners are removed before invocation for reentrant emit |
| `event_emitter_remove_latest` | EventEmitter off/removeListener removes the most recently added matching listener |
| `exponent_assign` | exponentiation compound assignment for number, BigInt, and dynamic values |
| `fs_append` | fs appendFileSync and immediate-settled fs.promises appendFile |
| `fs_chmod` | fs.chmodSync and immediate-settled fs.promises chmod with Stats.mode |
| `inheritance` | extends + super() + static members |
| `instanceof` | class instance ancestry checks |
| `interface_inheritance` | interface extends fields and typed object key order |
| `interfaces` | interface + object literal + nested refs + shorthand |
| `exceptions` | throw + try/catch/finally + re-throw + nested |
| `modules` | multi-file import/export |
| `namespaces` | namespace-scoped values/functions, lifted arrows, nested namespaces, and spread calls |
| `strings` | every supported String method |
| `math` | Math.* + constants, including Math.round negative-zero and min/max NaN behavior |
| `math_constants_more` | Math.SQRT1_2 plus direct trunc/sign and sign negative-zero coverage |
| `math_int32_float` | Math.imul, Math.clz32, and Math.fround |
| `math_more` | additional libm-backed Math methods, including variadic hypot and inverse trig |
| `number_constructor` | callable Number typed and dynamic coercion |
| `number_to_exponential` | Number.toExponential typed and dynamic scientific formatting |
| `number_to_fixed` | Number.toFixed typed and dynamic fixed-point formatting |
| `number_to_precision` | Number.toPrecision typed and dynamic significant-digit formatting |
| `path_constants` | path sep and delimiter constants for global, named import, and namespace import forms |
| `path_import` | path named and namespace imports from node:path/path |
| `path_normalize` | bounded POSIX path.normalize segment cleanup and path.isAbsolute checks |
| `path_relative` | bounded POSIX path.relative and named node:path import |
| `promise_settled` | settled Promise.resolve/reject with synchronous then/catch/finally chaining and combinators |
| `fs_copy_rename` | fs copyFileSync/renameSync and immediate-settled fs.promises copyFile/rename |
| `fs_encoding_options` | fs UTF-8 encoding string/object options for read/write/append sync and immediate-settled promise calls |
| `fs_lstat` | fs.lstatSync and immediate-settled fs.promises lstat with symbolic-link Stats |
| `fs_link` | fs.linkSync and immediate-settled fs.promises link |
| `fs_mkdtemp` | fs.mkdtempSync and immediate-settled fs.promises mkdtemp |
| `fs_promises` | immediate-settled fs.promises readFile/writeFile/readdir/access over the sync fs runtime |
| `fs_promises_import` | fs.promises named and namespace imports from node:fs/fs |
| `fs_promises_mutation` | immediate-settled fs.promises mkdir/unlink/rm/rmdir over the sync fs runtime |
| `fs_realpath` | fs.realpathSync and immediate-settled fs.promises realpath |
| `fs_readlink` | fs.readlinkSync and immediate-settled fs.promises readlink |
| `fs_recursive_options` | fs mkdir recursive and rm recursive/force options for sync and immediate-settled promise calls |
| `fs_roundtrip` | fs.readFileSync + writeFileSync + path helpers |
| `fs_stat` | fs.statSync, node:fs statSync, fs.promises.stat, and Promise.resolve over the typed Stats subset |
| `fs_symlink` | fs.symlinkSync and immediate-settled fs.promises symlink |
| `fs_sync_mutation` | fs mkdirSync/unlinkSync/rmSync/rmdirSync through node:fs namespace imports |
| `fs_truncate` | fs.truncateSync and immediate-settled fs.promises truncate |
| `function_closures` | returned closures with function-scope captures and mutable captured state |
| `function_value_spread` | spread calls through first-class function values |
| `generator_functions` | synchronous function* materialized Iterator/IterableIterator lowering with yield, bounded yield*, next, return, and throw |
| `generic_classes` | erased generic class fields/methods using dynamic value storage and spread method calls |
| `generic_function_values` | generic top-level functions assigned to concrete function-typed values |
| `global_number_predicates` | global isNaN/isFinite coercion for typed and dynamic values |
| `in_operator_narrowing` | in-operator narrowing and typed field-list checks |
| `line_directives` | generated C contains TS source `#line` markers |
| `logical_assign` | logical assignment with RHS short-circuiting |
| `map_constructor_from_map` | typed Map copy construction from another Map |
| `map_set` | Map + Set with all methods |
| `map_set_constructors` | Map from Object.entries and Set from array constructors |
| `map_set_for_each` | Map and Set forEach inline expression/block-body callbacks |
| `map_set_for_each_refs` | Map and Set forEach named callback references |
| `map_set_for_of` | direct Map `[key, value]` and Set value iteration |
| `map_set_same_value_zero` | Map and Set SameValueZero numeric key semantics |
| `native_addon` | expected diagnostic for literal native addon imports |
| `native_addon_package` | expected diagnostic for imported packages containing native addon binaries |
| `number_constants` | Number static constants |
| `number_static_more` | Number.is* predicates over any value plus parseInt/parseFloat coercion, radix support, radix inference, and invalid-radix handling |
| `json` | JSON.stringify of primitives, arrays, typed objects |
| `switch` | number + string switch with fall-through |
| `switch_exhaustive` | exhaustive finite-domain switch over literal unions and booleans |
| `switch_exhaustive_missing` | expected diagnostic for a missing finite-domain switch case |
| `symbols` | Symbol values, global registry, well-known symbols, typeof |
| `symbol_bigint_object_methods` | Symbol/BigInt toLocaleString and valueOf object methods |
| `tagged_templates` | tagged template calls with cooked string segments |
| `tail_calls` | direct self-tail recursion lowered to a loop |
| `typed_object_has_own` | typed Object.hasOwn, hasOwnProperty, and propertyIsEnumerable field checks |
| `typed_object_methods` | typed Object toString/toLocaleString/valueOf prototype fallback |
| `typed_object_property_names` | typed Object.getOwnPropertyNames field-list expansion |
| `typed_property_descriptor` | typed Object/Reflect field data descriptors |
| `typed_property_descriptors` | typed Object.getOwnPropertyDescriptors field descriptor maps |
| `typed_reflect_get` | typed Reflect.get field reads |
| `typed_reflect_has` | typed Reflect.has field checks |
| `typed_reflect_own_keys` | typed Reflect.ownKeys field-list expansion |
| `typed_reflect_set` | typed Reflect.set field writes |
| `regex` | PCRE2-backed regex: test, replace, match, split, flags |
| `regex_captures` | capture groups for non-global `.match()` |
| `regex_pcre2` | lookahead/lookbehind, named capture syntax, Unicode properties, dotAll |
| `regexp_exec` | RegExp.exec capture-array results |
| `regexp_extra_flags` | RegExp hasIndices/sticky flag properties |
| `regexp_object_methods` | RegExp source/flags/flag booleans and toString/toLocaleString/valueOf |
| `release_build` | `--release` size-optimized linking still produces a runnable binary |
| `rest_spread` | rest parameters plus spread arguments into rest and fixed-arity function/method calls |
| `nullish` | `??` + `?.` + null returns from functions |
| `advanced` | spread + Object.keys + Array.from + padStart + replace |
| `object_array_enumeration` | Object keys/values/entries/property names over typed arrays |
| `object_assign_array_target` | Object.assign into dynamic array targets |
| `object_assign_typed_target` | Object.assign into typed interface/class targets |
| `object_assign_typed_array_target` | Object.assign into typed array targets from typed, dynamic, and primitive sources |
| `object_assign_array_string` | Object.assign from dynamic array and string sources |
| `object_entries` | typed Object.entries/fromEntries over homogeneous object fields |
| `object_from_entries_map` | typed Object.fromEntries over Map<string, V> sources |
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
| `primitive_object_methods` | Number/Boolean toString/toLocaleString/valueOf primitive methods |
| `reflect_apply` | Reflect.apply over statically known function values and array/spread argument lists |
| `reflect_construct` | Reflect.construct over statically known class constructors and array/spread argument lists |
| `object_accessor_arrows` | dynamic lifted-arrow accessor descriptors |
| `object_accessor_closures` | dynamic closure-valued accessor descriptors |
| `object_accessor_preserve` | configurable accessor redefinition omitted-hook and omitted-flag preservation |
| `object_accessor_redefine` | compatible and incompatible non-configurable accessor redefinition |
| `object_accessors` | dynamic named-function accessor descriptors |
| `object_create_descriptors` | dynamic Object.create with descriptor maps |
| `object_define_property` | dynamic Object.defineProperty data descriptor value writes |
| `object_define_properties` | dynamic Object.defineProperties data/accessor descriptor maps |
| `object_descriptor_defaults` | dynamic descriptor omitted-value, undefined-accessor defaults, and absent hook fields |
| `object_descriptor_kind_transition` | configurable data/accessor descriptor kind transitions and non-configurable rejection |
| `object_descriptor_shorthand` | descriptor shorthand fields, accessor shorthand identifiers, and boolean flag expressions |
| `object_descriptor_redefine` | dynamic compatible non-configurable data descriptor redefinition |
| `object_descriptors` | dynamic descriptor flags, getOwnPropertyDescriptor, and Reflect helpers |
| `object_primitive_extensibility` | Object extensibility helpers on non-object primitives |
| `object_static_methods` | dynamic Object.assign, Object.hasOwn, and Object.getOwnPropertyNames |
| `reflect_dynamic` | basic Reflect.get/set over dynamic object properties |
| `reflect_get_own_property_descriptor` | Reflect descriptor lookup over dynamic object data properties |
| `reflect_receiver` | Reflect.get/set receiver arguments plus boxed accessor function identity and apply |
| `fn_refs` | named function refs + lifted arrow consts in HOFs |
| `call_arg_order` | left-to-right call argument evaluation with side effects |
| `captures` | module-level const/let used inside functions and arrows |
| `discriminated_unions` | literal discriminant checks over interface-shaped union values |
| `dynamic_property_assignment` | dynamic property writes and compound property writes |
| `dynamic_property_logical_assign` | dynamic property/index exponent and logical assignment |
| `dynamic_string_at` | dynamic String.at positive and negative index lookup |
| `dynamic_string_code_point_at` | dynamic String.codePointAt UTF-16 code-point lookup |
| `dynamic_string_concat` | dynamic string concat |
| `dynamic_string_locale_compare` | dynamic string localeCompare |
| `dynamic_string_normalize` | dynamic string Unicode normalization |
| `dynamic_string_pad_repeat` | dynamic string repeat, padStart, and padEnd |
| `dynamic_string_replace` | dynamic string replace and replaceAll |
| `dynamic_search_positions` | dynamic string/array optional search positions |
| `dynamic_string_split` | dynamic string split into dynamic arrays |
| `dynamic_string_split_limit` | dynamic String.split with string/RegExp limits |
| `dynamic_string_substr` | dynamic string substr start/length semantics |
| `dynamic_string_substring` | dynamic string substring clamp/swap semantics |
| `dynamic_string_trim_edges` | dynamic string trimStart and trimEnd |
| `dynamic_require` | expected diagnostic for non-literal `require(variable)` |
| `dynamic_coercions` | `any`/`unknown` unboxing into typed number/boolean/string/array destinations |
| `dynamic_index_assignment` | dynamic array index writes and compound index writes |
| `dynamic_last_index_of` | dynamic string and array lastIndexOf |
| `array_at` | Array.at positive and negative index lookup |
| `array_find_last` | Array.findLast and Array.findLastIndex reverse callback scan |
| `array_includes_same_value_zero` | typed and dynamic Array.includes SameValueZero behavior |
| `array_reduce_right` | Array.reduceRight reverse accumulation with explicit initial value |
| `array_search_from_index` | Array indexOf/includes/lastIndexOf fromIndex handling |
| `array_extensibility` | typed array Object/Reflect extensibility, seal, freeze, descriptor, and write state |
| `dynamic_array_at` | dynamic Array.at positive and negative index lookup |
| `dynamic_array_copy_within` | dynamic Array.copyWithin overlapping copy |
| `dynamic_array_define_property` | dynamic array Object/Reflect defineProperty for dense indexes and length |
| `dynamic_array_entries` | dynamic Array.entries materialized `[string, value]` arrays |
| `dynamic_array_extensibility` | dynamic array Object/Reflect extensibility, seal, freeze, descriptor, and mutator state |
| `dynamic_array_fill` | dynamic Array.fill range mutation |
| `dynamic_array_flat` | dynamic Array.flat depth behavior |
| `dynamic_array_flatmap` | dynamic Array.flatMap with inline callbacks |
| `dynamic_array_find_last` | dynamic Array.findLast and findLastIndex with inline callbacks |
| `dynamic_for_of` | for-of over dynamic array and string values |
| `dynamic_for_of_entries` | destructuring for-of over dynamic pair arrays and Object.entries(any) |
| `dynamic_for_of_rest` | rest destructuring for-of over dynamic pair/tuple arrays |
| `dynamic_array_hof` | dynamic Array.map/filter/find with inline expression/block-body callbacks and receiver args |
| `dynamic_array_hof_more` | dynamic Array.forEach/some/every/find/findIndex with inline callbacks |
| `dynamic_array_hof_refs` | dynamic array HOFs with named/closure callback references and receiver args |
| `dynamic_array_keys_values` | dynamic Array.keys index arrays and Array.values shallow copies |
| `dynamic_array_methods` | dynamic array shift/unshift/push/concat behavior |
| `dynamic_array_of` | Array.of<any> construction followed by dynamic array coercion |
| `dynamic_array_object_enumeration` | dynamic array Object/Reflect enumeration and descriptors |
| `dynamic_array_property_writes` | dynamic array string-key index writes and length writes |
| `dynamic_array_reduce` | dynamic Array.reduce with explicit initial value and expression/block-body callbacks |
| `dynamic_array_reduce_no_initial` | dynamic Array.reduce/reduceRight without explicit initial values |
| `dynamic_array_reduce_right` | dynamic Array.reduceRight with explicit initial value |
| `dynamic_array_slice_reverse` | dynamic Array.slice range copying and reverse receiver mutation |
| `dynamic_array_sort` | dynamic Array.sort default string-conversion ordering |
| `dynamic_array_sort_comparator` | dynamic Array.sort inline expression/block-body and named comparators |
| `dynamic_array_splice` | dynamic Array.splice mutation and removed-element return |
| `dynamic_array_spread` | dynamic array literal spread from dynamic arrays/strings and typed arrays |
| `dynamic_string_match` | dynamic string match/matchAll with RegExp captures |
| `dynamic_string_match_string` | dynamic string match/matchAll with string patterns |
| `dynamic_string_object_enumeration` | dynamic string Object/Reflect enumeration and descriptors |
| `dynamic_string_replace_regex` | dynamic String.replace/replaceAll with RegExp patterns |
| `dynamic_string_replace_regex_groups` | dynamic String.replace/replaceAll RegExp replacement tokens |
| `dynamic_string_replace_string_tokens` | dynamic String.replace/replaceAll string replacement tokens |
| `dynamic_string_search` | dynamic String.search with RegExp and string patterns |
| `dynamic_string_split_regex` | dynamic String.split with RegExp separators |
| `dynamic_array_to_reversed` | dynamic Array.toReversed non-mutating copy |
| `dynamic_array_to_sorted` | dynamic Array.toSorted default non-mutating sort |
| `dynamic_array_to_sorted_comparator` | dynamic Array.toSorted comparator non-mutating copy |
| `dynamic_array_to_spliced` | dynamic Array.toSpliced non-mutating splice |
| `dynamic_array_to_string` | dynamic Array.toString/toLocaleString comma-join conversion |
| `dynamic_array_value_of` | dynamic Array.valueOf receiver identity |
| `dynamic_array_with` | dynamic Array.with non-mutating replacement |
| `dynamic_bitwise_ops` | dynamic bitwise binary and compound operators |
| `dynamic_methods` | runtime method dispatch for common dynamic string/array methods |
| `dynamic_number_to_string` | dynamic Number.toString radix conversion |
| `dynamic_object_entries` | dynamic Object.entries over enumerable data/accessor properties |
| `dynamic_object_from_entries` | dynamic Object.fromEntries from dynamic key/value pairs |
| `dynamic_ops` | dynamic arithmetic, equality, relational, logical, nullish, and compound operators |
| `dynamic_property_ops` | dynamic `in` and `delete` property operations |
| `dynamic_unary_ops` | dynamic unary numeric and bitwise-not operators |
| `dynamic_update_ops` | dynamic pre/post update operators over local, property, and index lvalues |
| `dynamic_values` | NaN-boxed `any`/`unknown`, JSON.parse, heterogeneous arrays/objects |
| `stdlib_os` | os module + Date.now + Number.* statics |
| `runtime_eval` | expected diagnostic for `eval(...)` runtime compilation |
| `runtime_function_call` | expected diagnostic for direct `Function(...)` runtime compilation |
| `runtime_function_constructor` | expected diagnostic for the `new Function(...)` constructor |
| `set_keys` | Set.keys alias for Set.values |
| `string_char_code_at` | String.charCodeAt UTF-16 code-unit lookup |
| `string_search_positions` | String indexOf/includes/startsWith/endsWith/lastIndexOf position args |
| `string_at` | String.at positive and negative index lookup |
| `string_boolean_constructors` | callable String/Boolean typed and dynamic coercion |
| `string_concat` | String.concat |
| `string_codepoints` | String.fromCharCode + codePointAt |
| `string_from_code_point` | String.fromCodePoint Unicode scalar construction |
| `string_for_of` | Unicode string `for...of` iteration |
| `string_last_index_of` | String.lastIndexOf |
| `string_locale_compare` | String.localeCompare |
| `string_match_all` | matchAll full matches and capture groups |
| `string_match_string` | String.match/matchAll with string patterns |
| `string_normalize` | ICU-backed Unicode normalization forms |
| `string_object_enumeration` | typed string Object/Reflect enumeration and descriptors |
| `string_object_methods` | String toString/toLocaleString/valueOf identity methods |
| `string_replace_regex_groups` | String.replace RegExp replacement-token expansion |
| `string_replace_string_tokens` | String.replace/replaceAll string replacement-token expansion |
| `string_search_regex` | String.search over a typed RegExp |
| `string_search_string` | String.search with string patterns |
| `string_split_limit` | String.split with optional result limit |
| `string_substr` | String.substr start/length semantics |
| `string_substring` | String.substring clamp/swap semantics |
| `string_trim_aliases` | String trimLeft/trimRight aliases |
| `string_trim_edges` | String.trimStart and trimEnd |
| `string_well_formed` | String isWellFormed/toWellFormed over validated UTF-8 strings |
| `typeof` | typed `typeof` results with operand side effects preserved |
| `typeof_boolean_union` | `typeof` narrowing over `string | number | boolean` dynamic union storage |
| `typeof_guards` | typeof equality checks over nullable string values |
| `union_narrowing` | `typeof` narrowing over `string | number` dynamic union storage |
| `void_operator` | `void expr` side-effect preservation and undefined result |
| `url_object_methods` | URL toString/toJSON/toLocaleString/valueOf |
| `url_parse` | URL parsing fields |
| `weak_collections` | typed WeakMap/WeakSet with object keys |
| `weak_ref` | typed WeakRef construction and deref |
| `finalization_registry` | FinalizationRegistry register/unregister with optional unregister tokens |
| `set_composition` | ES2025 Set union/intersection/difference/symmetricDifference and subset/superset/disjoint predicates |
| `set_constructor_from_set` | typed Set copy construction from another Set |
| `map_group_by` | ES2024 Map.groupBy over typed arrays with arrow/block-body and named callback references |
| `string_compound_plus` | typed `string +=` compound assignment with implicit coercion of mixed rhs |
| `object_group_by` | ES2024 Object.groupBy over typed arrays returning a dynamic null-prototype object with expression/block-body callbacks |
| `array_from_mapper` | Array.from(items, mapfn) for typed arrays and string code-point sequences with expression/block-body callbacks |
| `array_from_dynamic_mapper` | Array.from(dynamic, mapfn) over boxed dynamic array/string sources |
| `array_from_set` | Array.from over typed Set sources with and without mapper callbacks |
| `array_from_map` | Array.from over typed Map<string, V> sources with and without mapper callbacks |
| `for_in` | for-in over typed classes/interfaces, typed arrays, and dynamic objects with continue/break |
| `map_entries` | typed Map<string, V>.entries() returning ObjectEntry<V>[] |
| `wordcount` | real-world: fs + regex + Map + sort + captures + env |
