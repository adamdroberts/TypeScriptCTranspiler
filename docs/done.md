# Implemented features

Everything in this file compiles end-to-end to a native binary via `./bin/tsc2c file.ts -o out`. Each bullet points at the test case under `tests/e2e/cases/` that exercises it and, where useful, at the runtime symbol or emitter method that implements it.

Verify all at once: `TSC2C_NO_GC=1 bun tests/e2e/run.ts`.

---

## 1. Language core

### Literals
- Numeric literals — decimal, `0x`/`0o`/`0b`, underscore separators → `formatNumericLiteral` in `src/emit/index.ts`. Test: `arith`
- BigInt literals (`0n`, `0xfn`, `0o77n`, `0b101n`), `BigInt(value, ...ignored)`, arithmetic/comparison/equality, unary minus, compound arithmetic assignment, `typeof`, `.toString(radix?, ...ignored)`, `.toLocaleString(...ignored)`, `.valueOf(...ignored)`, and inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)` backed by GMP. Tests: `bigint`, `symbol_bigint_object_methods`
- Symbol values via `Symbol(description?, ...ignored)`, `Symbol.for(key, ...ignored)`, `Symbol.keyFor(sym, ...ignored)`, `Symbol.iterator`, `Symbol.asyncIterator`, `.description`, `.toString(...ignored)`, `.toLocaleString(...ignored)`, `.valueOf(...ignored)`, inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)`, equality, and `typeof`. Tests: `symbols`, `symbol_bigint_object_methods`
- String literals with full C escape handling for UTF-8 and non-BMP code points → `escapeCString` in `src/emit/cbuf.ts`. Test: `hello`, `strings`, `string_for_of`
- Template literals with `${expr}` interpolation → `emitTemplate`. Test: `greet`, `fizzbuzz`
- Tagged template calls with a `TemplateStringsArray` first parameter and fixed substitution parameters. Test: `tagged_templates`
- `String.raw` tagged templates preserve raw template segments and stringify substitutions at compile time. Test: `string_raw`
- Boolean literals `true` / `false`. Test: `json`
- `null` / `undefined` / `NaN` / `Infinity` globals. Test: `nullish`, `stdlib_os`
- Array literals `[1, 2, 3]` with spread `[0, ...a, 6]` → `emitArrayLiteral`. Test: `advanced`
- Object literals `{ x: 1 }` matched against an interface/class shape → `emitObjectLiteral`. Test: `interfaces`
- Computed property names in typed object literals when the key resolves to a string/number literal, e.g. `{ [key]: value }`. Test: `computed_props`
- Regex literals `/pattern/flags` → `emitExpr` RegularExpressionLiteral branch. Tests: `regex`, `regex_pcre2`

### Primitives
- `number` → C `double` with shortest round-trip formatting. Runtime: `tsc_str_from_num`
- Callable `Number(value?, ...ignored)` returns JS-style numeric coercion for typed and dynamic values while evaluating ignored extra arguments. Test: `number_constructor`
- Number primitives expose `.toString(radix?)`, `.toFixed(fractionDigits?)`, `.toExponential(fractionDigits?)`, `.toPrecision(precision?)`, `.toLocaleString()`, `.valueOf()`, and inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)`; non-decimal radix conversion uses `tsc_str_from_num_radix`, fixed-point formatting uses `tsc_str_from_num_fixed`, scientific notation uses `tsc_str_from_num_exponential`, and significant-digit formatting uses `tsc_str_from_num_precision`. Tests: `primitive_object_methods`, `number_to_fixed`, `number_to_exponential`, `number_to_precision`
- `Number.isFinite`, `Number.isNaN`, `Number.isInteger`, and `Number.isSafeInteger` accept any typed or dynamic value, evaluate ignored extra arguments, and return `false` for non-number inputs; global `isNaN` and `isFinite` coerce typed and dynamic values with JS-style number conversion while evaluating ignored extra arguments. Tests: `number_static_more`, `global_number_predicates`
- `string` → immutable UTF-8 `tsc_str_t*`. Runtime: `tsc_str_from_lit`, `tsc_str_concat`, `tsc_str_eq`, `tsc_str_cmp`
- Callable `String(value?, ...ignored)` returns JS-style string coercion for typed and dynamic values while evaluating ignored extra arguments. Test: `string_boolean_constructors`
- `boolean` → C `bool` (stdbool.h)
- Boolean primitives expose `.toString()`, `.toLocaleString()`, `.valueOf()`, and inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)`. Test: `primitive_object_methods`
- Callable `Boolean(value?, ...ignored)` returns JS-style truthiness for typed and dynamic values while evaluating ignored extra arguments. Test: `string_boolean_constructors`
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
- TypeScript-only `expr satisfies T`, `expr as T`, `<T>expr`, and `expr!` assertions erase to the runtime operand. Test: `satisfies_expression`
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
- Default-initialized parameters are supported for omitted trailing arguments on top-level functions, constructors, instance methods, and static methods when the default expression does not reference `this`, `arguments`, or another parameter, including function-typed defaults initialized from arrow/function closure values. Omitted optional parameters without defaults are supported for pointer-like and dynamic parameter types, including strings, arrays, classes, function-typed parameters, and first-class closure values; numeric/boolean optional parameters still require explicit defaults. Tests: `default_parameters`, `default_parameter_function_initializers`, `optional_parameters`, `closure_optional_parameters`
- Recursion (direct)
- Top-level `const f = (...) => ...` **lifted to a static C function** — usable both as a call target and as an HOF callback. Test: `fn_refs`
- Inline arrow functions in HOF call sites, including expression bodies and single-return block bodies (body expanded inline via GCC statement expressions). Test: `array_hof`
- Function references passed as HOF callbacks — both declared functions and lifted-arrow consts. Test: `fn_refs`
- First-class typed closures for arrow/function expressions that capture enclosing function-scope locals or parameters. Captured storage is boxed in GC-managed ref cells and closure values lower to generated `{fn, env}` structs per signature; calls through function-typed values support spread arguments from dynamic arrays/strings with runtime arity checks and omitted optional pointer-like/dynamic parameters without defaults. Tests: `function_closures`, `function_value_spread`, `closure_optional_parameters`
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
- Settled `Promise<T>` values lower to `tsc_promise_t*`. `new Promise<T>(executor)` calls the executor synchronously with generated `resolve` / `reject` callbacks that settle at most once, converts executor throws into rejections unless the promise is already settled, and returns pending when the executor does not settle. `Promise.resolve(value, ...ignored)` resolves typed values and adopts existing native Promise records after evaluating ignored extras, `Promise.reject(reason, ...ignored)` rejects after evaluating ignored extras, `Promise.try(callback)` invokes the callback synchronously and turns returned values or returned native Promise records into fulfilled/adopted results while throws become rejected records, synchronous `.then(...)`, `.then(undefined, onRejected)`, `.catch(...)`, `.finally(...)`, and settled-array `Promise.all` / `allSettled` / `race` / `any` are implemented for compiler-known callbacks and promise arrays. Omitted fulfillment handlers in `.then()` pass fulfilled values through, omitted/undefined `.catch()` / `.finally()` handlers preserve fulfilled, rejected, and pending state, immediate `.then` / `.catch` callbacks adopt returned native Promise records or convert throws into rejected Promise records, and immediate `.finally()` callbacks preserve the original state unless they throw or return rejected/pending native Promise records. Top-level `async function` declarations, class `async` methods, and async function values return immediate Promise records for fulfilled values, adopted returned promises, implicit `undefined` returns, synchronous uncaught throw rejections, and immediate `await` over native Promise records or non-Promise values; fulfilled awaits unwrap values including typed `FSStats` and `Buffer` side-channel results, non-Promise awaits evaluate once and continue with that value, local `try`/`catch` can catch rejected awaits, uncaught rejected awaits return rejected Promise records, and pending awaits return pending Promise records without scheduling a continuation. `Promise.any` rejects with an AggregateError-shaped dynamic object containing `name`, `message`, and `errors` when every input rejects, including empty input; empty `Promise.race([])` returns a pending promise; and pending records propagate through immediate `all` / `allSettled` / `race` / `any` without synchronously invoking chained callbacks. `queueMicrotask(callback)` supports a bounded before-exit zero-argument callback queue drained after `process.nextTick`; `setTimeout(callback, 0, ...args)`, `setTimeout(callback, undefined, ...args)`, `setTimeout(callback, void 0, ...args)`, and `setTimeout(callback, -0, ...args)` support a bounded zero-delay queue with up to three typed callback arguments drained after next ticks and microtasks, return numeric handles, and can be canceled before drain with `clearTimeout(handle)` or `clearInterval(handle)`; `setImmediate(callback, ...args)` supports a bounded before-exit queue with up to three typed callback arguments drained after next ticks, microtasks, and zero-delay timeouts, returns a numeric handle, and can be canceled before drain with `clearImmediate(handle)`. Omitted or undefined-valued `clearTimeout` / `clearInterval` / `clearImmediate` handles are no-op clears that still evaluate argument side effects. This is a settled/immediate subset; suspend/resume state machines, Promise microtask ordering, real timer integration, arbitrary thenable assimilation, and broader awaited rejection edge cases remain deferred. Tests: `promise_executor`, `promise_resolve_adopt`, `promise_try`, `promise_callback_adopt`, `promise_finally_adopt`, `promise_settled`, `promise_then_passthrough`, `promise_empty_handlers`, `promise_callback_throw`, `async_function_immediate`, `async_methods_immediate`, `async_function_values_immediate`, `async_throw_rejection`, `async_await_immediate`, `async_await_values_immediate`, `async_await_try_catch`, `promise_any_aggregate`, `promise_race_empty_pending`, `promise_pending_combinators`, `queue_microtask`, `set_timeout_zero`, `set_immediate`, `timers_clear`, `fs_read_file_buffer_options`, `fs_read_file_null_buffer_options`

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
- **Static initialization blocks** — emitted in member order with static field initializers during module initialization. Test: `class_static_blocks`
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
- `.push(...)` / `.pop(...ignored)` — `tsc_array_push_raw`, `tsc_array_pop_raw`; ignored `pop` arguments are evaluated before being discarded. Test: `arrays`
- `.shift(...ignored)` / `.unshift(...)` — `tsc_array_shift_raw`, `tsc_array_unshift_raw`; ignored `shift` arguments are evaluated before being discarded. Test: `arrays`
- `.reverse(...ignored)` — in-place via `tsc_array_reverse` after evaluating ignored extra arguments. Test: `arrays`
- `.toReversed(...ignored)` — copy via `tsc_array_to_reversed`; original array remains unchanged and ignored extra arguments are evaluated. Test: `array_to_reversed`
- `.fill(value, start?, end?)` — in-place via `tsc_array_fill`. Test: `array_fill`
- `.copyWithin(target, start, end?)` — in-place via `tsc_array_copy_within`. Test: `array_copy_within`
- `.at(index)` — positive and negative index lookup. Test: `array_at`
- `.with(index, value)` — copy via `tsc_array_with`; original array remains unchanged and negative indices count from the end. Test: `array_with`
- `.toSpliced(start?, deleteCount?, ...items)` — copy via `tsc_array_to_spliced`; original array remains unchanged. Test: `array_to_spliced`
- `.slice(start?, end?)` — `tsc_array_slice`
- `.concat(...items)` — copy plus `tsc_array_append`/`tsc_array_push_raw`; accepts array arguments, single element arguments, and spread elements inside array-literal arguments. Test: `array_concat_values`
- `.join(sep?)` — with type-driven element stringification
- `.toString(...ignored)` / `.toLocaleString(...ignored)` — typed arrays reuse comma-join stringification after evaluating ignored extra arguments. Test: `array_to_string`
- `.valueOf(...ignored)` — returns the typed array receiver unchanged after evaluating ignored extra arguments. Test: `array_value_of`
- `.keys(...ignored)` / `.values(...ignored)` / `.entries(...ignored)` — returns a number-index array, a shallow value copy, or `[string, value]` entry arrays after evaluating ignored extra arguments. Tests: `array_keys_values`, `array_entries`
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
- `.keys(...ignored)`, `.values(...ignored)` — returns typed array; `.entries(...ignored)` returns a typed `ObjectEntry<V>[]` for `Map<string, V>`. Ignored extra arguments are evaluated before being discarded. Test: `map_entries`
- `.forEach((value, key, map) => expr)` — inline expression-body or single-return block-body callbacks and named callback references over insertion order. Tests: `map_set_for_each`, `map_set_for_each_refs`
- Direct `for...of` with `[key, value]` destructuring. Test: `map_set_for_of`
- `.size` property. Test: `map_set`, `wordcount`
- `.toString(...ignored)`, `.toLocaleString(...ignored)`, and `.valueOf(...ignored)`. Test: `collection_object_methods`
- Key equality is polymorphic by tag: SameValueZero numbers, string content, booleans, and pointers. Runtime: `key_eq`
- ES2024 static `Map.groupBy(items: T[], keyFn: (value: T, index: number) => K): Map<K, T[]>` groups a typed array into a typed `Map<K, T[]>` by the callback's return value. The callback may be an inline arrow/function expression with an expression body or single-return block body, or a function reference (including generic functions). Test: `map_group_by`

### `Set<T>`
- `new Set<T>()`, `new Set(valuesArray)`, and `new Set(existingSet)` — `tsc_set_new(sizeof(T), keyKind, initialCap)` plus per-value insertion. Tests: `map_set_constructors`, `set_constructor_from_set`
- `.add(v)`, `.has(v)`, `.delete(v)`, `.clear()`, `.keys(...ignored)`, `.values(...ignored)`, `.forEach((value, value2, set) => expr)`, `.size`; numeric values use SameValueZero semantics, ignored key/value iterator arguments are evaluated before being discarded, and `forEach` accepts inline expression-body or single-return block-body callbacks and named callback references. Tests: `map_set`, `map_set_same_value_zero`, `set_keys`, `map_set_for_each`, `map_set_for_each_refs`
- Direct `for...of` over values. Test: `map_set_for_of`
- `.toString(...ignored)`, `.toLocaleString(...ignored)`, and `.valueOf(...ignored)`. Test: `collection_object_methods`
- ES2025 set composition: `.union(other)`, `.intersection(other)`, `.difference(other)`, `.symmetricDifference(other)`, `.isSubsetOf(other)`, `.isSupersetOf(other)`, `.isDisjointFrom(other)`. The argument must be a `Set<T>` of the same element type; runtime helpers `tsc_set_union`/`tsc_set_intersection`/`tsc_set_difference`/`tsc_set_symmetric_difference`/`tsc_set_is_subset_of`/`tsc_set_is_superset_of`/`tsc_set_is_disjoint_from` honor SameValueZero element matching and insertion order. Test: `set_composition`

### `WeakMap<K, V>` / `WeakSet<T>`
- Typed object-key `WeakMap` supports `.set(k, v)`, `.get(k)`, `.has(k)`, and `.delete(k)`. Test: `weak_collections`
- Typed object-key `WeakSet` supports `.add(v)`, `.has(v)`, and `.delete(v)`. Test: `weak_collections`
- `.toString(...ignored)`, `.toLocaleString(...ignored)`, and `.valueOf(...ignored)` on both weak collections. Test: `collection_object_methods`
- Runtime storage reuses pointer-key map/set tables; there is no iteration API exposed.

### `WeakRef<T>`
- `new WeakRef(target)` creates a typed weak-reference wrapper, and `.deref(...ignored)` returns `T | undefined` after evaluating ignored extra arguments. Test: `weak_ref`
- `.toString(...ignored)`, `.toLocaleString(...ignored)`, and `.valueOf(...ignored)`. Tests: `collection_object_methods`, `weak_ref`
- Runtime storage is a small pointer wrapper.

### `FinalizationRegistry<T>`
- `new FinalizationRegistry<T>(cleanupCallback)` is constructible against any cleanup-callback signature; the callback value is evaluated for side effects and discarded. Test: `finalization_registry`
- `.register(target, heldValue, unregisterToken?, ...ignored)` evaluates target, held value, token, and ignored extras, records the optional token entry, and `.unregister(unregisterToken, ...ignored)` removes any matching entries after evaluating ignored extras, returning whether anything was removed. Test: `finalization_registry`
- `.toString(...ignored)` and `.toLocaleString(...ignored)` return `"[object FinalizationRegistry]"`, and `.valueOf(...ignored)` returns the receiver. Test: `finalization_registry`
- This AOT runtime has no GC-finalizer plumbing, so the cleanup callback is never invoked. The behavior matches WeakRef in spirit: type-correct API surface without observable garbage-collection callbacks.

---

## 5. Strings

All methods on the `String` interface map to `tsc_str_*` runtime calls:

- `.length` → `tsc_str_length`
- `.charAt(i?, ...ignored)` → `tsc_str_char_at` after evaluating ignored extra arguments. Test: `string_char_code_at`
- `.charCodeAt(i?, ...ignored)` → `tsc_str_char_code_at`, returning JS UTF-16 code units after evaluating ignored extra arguments. Test: `string_char_code_at`
- `.at(i?, ...ignored)` → `tsc_str_at`, including negative-index lookup after evaluating ignored extra arguments. Tests: `string_at`, `string_char_code_at`
- `.codePointAt(i?, ...ignored)` → `tsc_str_code_point_at` after evaluating ignored extra arguments. Tests: `string_codepoints`, `string_char_code_at`
- `String.fromCharCode(...)` → `tsc_str_from_char_code_n`. Test: `string_codepoints`
- `String.fromCodePoint(...)` → `tsc_str_from_code_point_n`. Test: `string_from_code_point`
- `String.raw` tagged templates concatenate raw segments with stringified substitutions. Test: `string_raw`
- `.indexOf(needle, position?, ...ignored)` / `.lastIndexOf(needle, position?, ...ignored)` → `tsc_str_index_of`, `tsc_str_last_index_of` after evaluating ignored extra arguments. Tests: `string_last_index_of`, `string_search_positions`
- `.localeCompare(other, ...ignored)` → `tsc_str_locale_compare` using deterministic runtime string ordering after evaluating ignored extra arguments. Test: `string_locale_compare`
- `.includes(needle, position?, ...ignored)` → `tsc_str_includes` after evaluating ignored extra arguments. Test: `string_search_positions`
- `.startsWith(p, position?, ...ignored)` → `tsc_str_starts_with` after evaluating ignored extra arguments. Test: `string_search_positions`
- `.endsWith(p, endPosition?, ...ignored)` → `tsc_str_ends_with` after evaluating ignored extra arguments. Test: `string_search_positions`
- `.slice(start?, end?, ...ignored)` → `tsc_str_slice` after evaluating ignored extra arguments.
- `.substring(start?, end?, ...ignored)` → `tsc_str_substring`, including clamp/swap semantics after evaluating ignored extra arguments. Test: `string_substring`
- `.substr(start?, length?, ...ignored)` → `tsc_str_substr`, including negative-start and length clamping semantics after evaluating ignored extra arguments. Test: `string_substr`
- `.toUpperCase(...ignored)` / `.toLowerCase(...ignored)` → `tsc_str_to_upper`, `tsc_str_to_lower` after evaluating ignored extra arguments. Test: `strings`
- `.toString(...ignored)` / `.toLocaleString(...ignored)` / `.valueOf(...ignored)` return the typed string receiver unchanged after evaluating ignored extra arguments, and inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)` report string indexes plus non-enumerable `length` ownership. Test: `string_object_methods`
- `.normalize(form?, ...ignored)` → `tsc_str_normalize` backed by ICU for NFC/NFD/NFKC/NFKD after evaluating ignored extra arguments. Test: `string_normalize`
- Typed strings participate in `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, `Reflect.get`, `Reflect.has`, `Reflect.ownKeys`, `Reflect.getOwnPropertyDescriptor`, `Reflect.deleteProperty`, and `Reflect.set` with read-only string index descriptors plus non-enumerable `length`. Test: `string_object_enumeration`
- `.trim(...ignored)` / `.trimStart(...ignored)` / `.trimEnd(...ignored)` plus `.trimLeft(...ignored)` / `.trimRight(...ignored)` aliases → `tsc_str_trim`, `tsc_str_trim_start`, `tsc_str_trim_end` after evaluating ignored extra arguments. Tests: `string_trim_edges`, `string_trim_aliases`
- `.isWellFormed(...ignored)` / `.toWellFormed(...ignored)` → `true` / receiver identity for the runtime's validated UTF-8 string representation after evaluating ignored extra arguments. Test: `string_well_formed`
- `.repeat(n, ...ignored)` → `tsc_str_repeat` after evaluating ignored extra arguments. Test: `strings`
- `.padStart(len, pad?, ...ignored)` / `.padEnd(len, pad?, ...ignored)` → `tsc_str_pad_start`, `tsc_str_pad_end` after evaluating ignored extra arguments. Test: `strings`
- `.replace(search, repl, ...ignored)` → `tsc_str_replace` or `tsc_str_replace_regex` (if `search` is a RegExp); string and RegExp replacement strings expand dollar, whole-match, prefix, and suffix tokens, and RegExp replacements also expand capture tokens after evaluating ignored extra arguments. Tests: `string_replace_string_tokens`, `string_replace_regex_groups`, `strings`
- `.replaceAll(search, repl, ...ignored)` → `tsc_str_replace_all` or regex version, sharing the replacement-string expansion path after evaluating ignored extra arguments. Tests: `string_replace_string_tokens`, `strings`
- `.match(regexOrString, ...ignored)` → `tsc_str_match_regex`; string patterns are lowered through `RegExp(pattern)` after evaluating ignored extra arguments. Test: `string_match_string`
- `.matchAll(regexOrString, ...ignored)` → `tsc_str_match_all_regex`, returning `string[][]` groups; string patterns are lowered through global `RegExp(pattern, "g")` after evaluating ignored extra arguments. Tests: `string_match_all`, `string_match_string`
- `.search(regexOrString, ...ignored)` → `tsc_str_search_regex`; string patterns are lowered through `RegExp(pattern)` after evaluating ignored extra arguments. Tests: `string_search_regex`, `string_search_string`
- `.split(sep, limit?, ...ignored)` / `.split(regex, limit?, ...ignored)` → `tsc_str_split` / `tsc_str_split_limit_num` / `tsc_str_split_regex` / `tsc_str_split_regex_limit_num`; RegExp separator captures are included in the output after evaluating ignored extra arguments. Tests: `string_split_limit`, `strings`
- `.concat(...strings)` → repeated `tsc_str_concat`. Test: `string_concat`
- `for...of` over strings → `tsc_str_chars`, yielding one string per UTF-8 code point. Test: `string_for_of`
- String + anything → concat with automatic stringification
- Index access `s[i]` → same as `charAt`

Tests: `strings`, `string_at`, `string_concat`, `string_for_of`, `string_last_index_of`, `string_locale_compare`, `string_match_all`, `string_normalize`, `string_object_methods`, `string_search_regex`, `string_split_limit`, `string_substr`, `string_substring`, `string_trim_edges`, `wordcount`

---

## 6. Regex (PCRE2-backed)

- `/pattern/flags` literal syntax — parsed at emit time. Test: `regex`
- `new RegExp(pattern, flags?)` and callable `RegExp(pattern, flags?)` construct the same PCRE2-backed runtime from string patterns and flags. Test: `regexp_constructor`
- Flag support: `d`, `g`, `i`, `m`, `s`, `u`, `y` properties (`hasIndices`, global, ignore-case, multiline, dotAll, Unicode, sticky). Tests: `regexp_object_methods`, `regexp_extra_flags`
- PCRE2 syntax support for lookahead/lookbehind, named capture syntax, and Unicode property escapes. Test: `regex_pcre2`
- `RegExp.escape(text)` → `tsc_regexp_escape`, returning a literal-pattern string for leading ASCII alphanumerics, regex syntax characters, broader ASCII punctuators, and whitespace/control bytes. Test: `regexp_escape`
- `re.exec(s, ...ignored)` → `tsc_regexp_exec`, returning the full match plus captures or `null` after evaluating ignored extra arguments. Tests: `regexp_exec`, `regexp_object_methods`
- `re.test(s, ...ignored)` → `tsc_regexp_test`, with ignored extra arguments evaluated before being discarded. Test: `regexp_object_methods`
- `re.source`, `re.flags`, `re.global`, `re.hasIndices`, `re.ignoreCase`, `re.multiline`, `re.dotAll`, `re.sticky`, `re.unicode`, `re.toString(...ignored)`, `re.toLocaleString(...ignored)`, and `re.valueOf(...ignored)`. Tests: `regexp_object_methods`, `regexp_extra_flags`
- String-side methods with regex argument: `.replace`, `.replaceAll`, `.match`, `.search`, `.split`
- Capture groups on non-global `.match()` results. Test: `regex_captures`
- `.matchAll(regex)` full-match and capture arrays. Test: `string_match_all`
- Runtime: `tsc_regexp_new`, `tsc_regexp_escape`, `tsc_regexp_exec`, `tsc_regexp_to_string`, `tsc_str_replace_regex`, `tsc_str_match_regex`, `tsc_str_match_all_regex`, `tsc_str_search_regex`, `tsc_str_split_regex`, `tsc_str_split_regex_limit_num` (all in `runtime/tsc_runtime.c`)

---

## 7. Modules

- Multi-file compilation via `ts.createProgram` — walks `import`/`export` declarations. Test: `modules`
- `src/resolve.ts` builds the dependency graph, topo-sorts modules
- Each module's top-level statements wrapped in a static `mod_init_<moduleId>(void)` function
- `main()` calls `mod_init_*` in topological order (deps first)
- Flat symbol namespace — function/class/const names are global across the program
- Local relative imports: `import { x } from "./y"` resolves via `ts.resolveModuleName`
- Default imports and renamed named imports resolve through TypeScript aliases to the exported declaration names during C emission, including default class imports, default imports of identifier export assignments, and anonymous default-exported functions. Tests: `module_import_aliases`, `module_default_class_import`, `module_default_export_assignment`, `module_default_anonymous_function`
- Simple barrel re-exports through `export { name } from "./module"`, `export { default as name } from "./module"`, and `export * from "./module"` resolve to the original emitted declarations. Tests: `module_re_exports`, `module_default_re_export`, `module_export_star`
- Module namespace imports resolve exported value/function members directly to emitted declarations for local modules and resolvable TypeScript package sources. Tests: `module_namespace_import`, `node_modules_package_namespace`
- Resolvable TypeScript and basic JavaScript package sources under `node_modules` are included in the module graph when TypeScript resolves package `exports`, package-local JS import edges, package `main` fallback entries, package-internal `imports`, namespace import entries, and side-effect-only package entries to source files. JS package sources are loaded with `allowJs` / `checkJs: false` and lower through `any` / dynamic value erasure in this bounded subset, including untyped JS object literals as dynamic objects, untyped JS array literals as dynamic arrays, default-exported object literals, and named/default/namespace imports that reference those literals. Tests: `node_modules_package_exports`, `node_modules_package_main`, `node_modules_package_imports`, `node_modules_package_namespace`, `node_modules_js_package`, `node_modules_js_package_relative_import`, `node_modules_package_side_effect`, `node_modules_commonjs_assignment_esmodule_marker`, `node_modules_commonjs_exports_alias`, `node_modules_commonjs_object_assign_require_exports`, `node_modules_commonjs_object_assign_exports`, `node_modules_commonjs_object_assign_from_entries_exports`, `node_modules_commonjs_object_assign_identifier_exports`, `node_modules_commonjs_object_assign_spread_exports`, `node_modules_commonjs_object_literal_computed_exports`, `node_modules_commonjs_object_assign_getter_exports`, `node_modules_commonjs_object_assign_require_member_exports`, `node_modules_commonjs_object_assign_require_binding_exports`, `node_modules_commonjs_define_properties_exports`, `node_modules_commonjs_define_properties_identifier_exports`, `node_modules_commonjs_define_properties_own_descriptors_exports`, `node_modules_commonjs_define_properties_own_descriptors_accessor_exports`, `node_modules_commonjs_define_properties_descriptor_identifier_exports`, `node_modules_commonjs_define_property_computed_exports`, `node_modules_commonjs_define_property_default_export`, `node_modules_commonjs_define_property_exports`, `node_modules_commonjs_define_property_identifier_exports`, `node_modules_commonjs_define_property_require_member_exports`, `node_modules_commonjs_define_property_require_binding_exports`, `node_modules_commonjs_define_properties_require_binding_descriptors`, `node_modules_commonjs_module_exports_static_metadata`, `node_modules_commonjs_define_property_getter_exports`, `node_modules_commonjs_export_assignment_chains`, `node_modules_commonjs_export_placeholders`, `node_modules_commonjs_module_exports_object_assign_default`, `node_modules_commonjs_module_exports_object_assign_named`, `node_modules_commonjs_module_exports_object_assign_exports_target_named`, `node_modules_commonjs_module_exports_object_assign_create_target_named`, `node_modules_commonjs_module_exports_object_assign_create_descriptors_target_named`, `node_modules_commonjs_module_exports_object_assign_create_descriptors_identifier_target_named`, `node_modules_commonjs_module_exports_define_properties_named`, `node_modules_commonjs_module_exports_define_properties_target_named`, `node_modules_commonjs_module_exports_define_properties_wrapper_target_named`, `node_modules_commonjs_module_exports_define_property_named`, `node_modules_commonjs_module_exports_define_property_target_named`, `node_modules_commonjs_module_exports_define_property_wrapper_target_named`, `node_modules_commonjs_module_exports_object_create_default`, `node_modules_commonjs_module_exports_object_create_descriptors_named`, `node_modules_commonjs_module_exports_object_wrapper_create_descriptors_named`, `node_modules_commonjs_module_exports_object_wrapper_create_descriptor_variants_named`, `node_modules_commonjs_module_exports_object_wrapper_define_properties_named`, `node_modules_commonjs_module_exports_object_wrapper_define_properties_variants_named`, `node_modules_commonjs_module_exports_object_wrapper_define_property_named`, `node_modules_commonjs_module_exports_object_wrapper_define_property_variants_named`, `node_modules_commonjs_module_exports_object_wrapper_assign_named`, `node_modules_commonjs_module_exports_object_wrapper_assign_variants_named`, `node_modules_commonjs_module_exports_object_define_property_default`, `node_modules_commonjs_module_exports_object_from_entries_default`, `node_modules_commonjs_module_exports_dynamic_computed`, `node_modules_commonjs_module_exports_object_runtime_defaults`, `node_modules_commonjs_module_exports_object_wrappers_named`, `node_modules_commonjs_module_exports_object_set_prototype_named`, `node_modules_commonjs_module_exports_object_spread_named`, `node_modules_commonjs_module_exports_object_getter_named`, `node_modules_commonjs_object_spread_default`
- Function-scoped static literal CommonJS `require(...)` bindings and local `require`/`module.require` aliases are included in the module graph and lower eagerly for namespace member calls, destructured member calls, bound default-function calls, and direct default-function calls. Tests: `node_modules_commonjs_function_scope_require`, `node_modules_commonjs_function_scope_require_alias`
- A narrow CommonJS package-source subset lowers top-level `exports.name = ...`, `module.exports.name = ...`, static top-level `const out = exports` / `const mod = module.exports` alias mutations, chained `exports.name = module.exports.name = ...`, chained `module.exports.name = exports.name = ...`, `exports.name = void 0` / `module.exports.name = void 0` placeholder elision, `exports.default = ...`, `Object.defineProperty(exports, "default", { value })` default interop, `Object.defineProperty(exports, "name", { value })` / `Object.defineProperty(module.exports, "name", { value })` data exports, statically computed `Object.defineProperty`/`Object.defineProperties` keys, plus static descriptor-variable sources such as `Object.defineProperty(exports, "name", descriptor)`, top-level `Object.defineProperties(exports, { name: descriptor })` descriptor-map entries where `descriptor` may be a static object-literal variable, and static declared descriptor-map `Object.defineProperties(exports, descriptors)` exports, `Object.defineProperties(exports, Object.getOwnPropertyDescriptors(api))` descriptor-preserving exports, top-level `Object.assign(exports, { name: value })` / `Object.assign(module.exports, { name: value })` data/default export mutation plus static object-literal getter entries such as `Object.assign(exports, { get name() { return value; } })`, static declared-object, statically computed object-literal, and static object-spread sources such as `Object.assign(exports, api)` including entries backed by declared package-local require bindings, `Object.assign(exports, Object.fromEntries(...))` data/default export mutation, top-level `Object.assign(exports, require("./local.js"))` / `Object.assign(module.exports, require("./local.js"))` package-local re-export mutation, and simple zero-arg getter exports, string-literal and statically computed `exports["name"] = ...` / `module.exports["name"] = ...`, including static string concatenation and template-literal keys, object-literal static computed-key/identifier/require-binding/inline-require/function-valued/arrow-function-valued/method/getter/primitive-literal/spread-source exports, function-valued / arrow-function-valued / identifier-valued / primitive-literal / array-valued / static object-or-array-literal and supported runtime-computed dynamic-object `module.exports = ...` defaults via `Object.assign`/`Object.create`/`Object.defineProperty`/`Object.defineProperties`/`Object.fromEntries`/`Object.setPrototypeOf`/`Object.preventExtensions`/`Object.seal`/`Object.freeze`, plus require-bound dynamic key reads of emitted whole `module.exports` objects, plus static named metadata for `module.exports = Object.create(proto, descriptors)`, wrapped `module.exports = Object.freeze(Object.create(proto, descriptors))`, wrapped `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` over `Object.create(proto, descriptors)`, wrapped `module.exports = Object.freeze(Object.defineProperties({}, descriptors))`, wrapped `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` over `Object.defineProperties({}, descriptors)`, wrapped `module.exports = Object.freeze(Object.defineProperty(object, key, descriptor))` and `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` variants, wrapped `module.exports = Object.freeze(Object.assign(...))`, wrapped `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` over `Object.assign(...)`, `module.exports = Object.assign(...)`, `module.exports = Object.assign(exports, ...)`, `module.exports = Object.defineProperties(...)` with static target object and wrapper-target metadata, `module.exports = Object.defineProperty(...)` including static target object and wrapper-target metadata, `module.exports = Object.fromEntries([...])`, `module.exports = Object.fromEntries(entries)`, statically computed `Object.fromEntries` keys, `module.exports = Object.fromEntries([...])` entries backed by package-local require values, `module.exports = Object.fromEntries(Object.entries(api))` object sources, `module.exports = Object.fromEntries(entries)` where `entries = Object.entries(api)`, wrapped `module.exports = Object.freeze(Object.fromEntries(...))`, wrapped `Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` over `Object.fromEntries(...)`, and static `Object.freeze`/`Object.seal`/`Object.preventExtensions`/`Object.setPrototypeOf` wrappers, including whole-value `module.exports = exports.default = fn` function chains and object-spread defaults over dynamic object values, top-level literal `const pkg = require("pkg")` member reads/calls, top-level literal `require("pkg").name` member reads/calls, top-level literal `require("pkg")` reads for module-exported default values, top-level literal `require("pkg")(...)` calls for function-valued module exports, top-level literal `const { name, alias: local } = require("pkg")` bindings, top-level literal `const fn = require("pkg")` calls for function-valued module exports, package-local top-level literal `require("./local.js")` member/default/direct-default/member-default re-exports, descriptor values backed by declared package-local require bindings, top-level static `require` / `module.require` aliases plus top-level and package-local literal `module.require(...)` member reads/calls/re-exports, side-effect-only top-level `require("pkg")`, transpiled-ESM `__esModule` marker elision including `exports.__esModule = true`, and read-only `module.filename` / `module.id` / `module.path` / `module.loaded` / `module.paths` / `module.parent` / `module.children` / `module.isPreloading` metadata to module-scoped exported bindings/init edges for named imports, default imports including `exports.default` and object-valued whole-value defaults, namespace member reads/calls including `default` and object-literal default members, require-bound package namespace reads/calls, direct require member reads/calls, direct require default-value reads/calls, require destructuring reads/calls, require-bound primitive/function calls and reads, package-local re-export calls, and eager side-effect package init. Tests: `node_modules_commonjs_assignment_esmodule_marker`, `node_modules_commonjs_exports_alias`, `node_modules_commonjs_object_assign_require_exports`, `node_modules_commonjs_object_assign_exports`, `node_modules_commonjs_object_assign_from_entries_exports`, `node_modules_commonjs_object_assign_identifier_exports`, `node_modules_commonjs_object_assign_spread_exports`, `node_modules_commonjs_object_literal_computed_exports`, `node_modules_commonjs_object_assign_getter_exports`, `node_modules_commonjs_object_assign_require_member_exports`, `node_modules_commonjs_object_assign_require_binding_exports`, `node_modules_commonjs_define_properties_exports`, `node_modules_commonjs_define_properties_identifier_exports`, `node_modules_commonjs_define_properties_own_descriptors_exports`, `node_modules_commonjs_define_properties_own_descriptors_accessor_exports`, `node_modules_commonjs_define_properties_descriptor_identifier_exports`, `node_modules_commonjs_define_property_computed_exports`, `node_modules_commonjs_define_property_default_export`, `node_modules_commonjs_define_property_exports`, `node_modules_commonjs_define_property_identifier_exports`, `node_modules_commonjs_define_property_require_member_exports`, `node_modules_commonjs_define_property_require_binding_exports`, `node_modules_commonjs_define_properties_require_binding_descriptors`, `node_modules_commonjs_module_exports_static_metadata`, `node_modules_commonjs_define_property_getter_exports`, `node_modules_commonjs_export_assignment_chains`, `node_modules_commonjs_export_placeholders`, `node_modules_commonjs_exports_default_interop`, `node_modules_commonjs_package_named`, `node_modules_commonjs_bracket_exports`, `node_modules_commonjs_computed_exports`, `node_modules_commonjs_computed_string_exports`, `node_modules_commonjs_module_exports_array`, `node_modules_commonjs_module_exports_object`, `node_modules_commonjs_module_exports_object_require_binding`, `node_modules_commonjs_module_exports_object_require_member`, `node_modules_commonjs_module_exports_object_assign_default`, `node_modules_commonjs_module_exports_object_assign_named`, `node_modules_commonjs_module_exports_object_assign_exports_target_named`, `node_modules_commonjs_module_exports_object_assign_create_target_named`, `node_modules_commonjs_module_exports_object_assign_create_descriptors_target_named`, `node_modules_commonjs_module_exports_object_assign_create_descriptors_identifier_target_named`, `node_modules_commonjs_module_exports_define_properties_named`, `node_modules_commonjs_module_exports_define_properties_target_named`, `node_modules_commonjs_module_exports_define_properties_wrapper_target_named`, `node_modules_commonjs_module_exports_define_property_named`, `node_modules_commonjs_module_exports_define_property_target_named`, `node_modules_commonjs_module_exports_define_property_wrapper_target_named`, `node_modules_commonjs_module_exports_object_create_default`, `node_modules_commonjs_module_exports_object_create_descriptors_named`, `node_modules_commonjs_module_exports_object_wrapper_create_descriptors_named`, `node_modules_commonjs_module_exports_object_wrapper_create_descriptor_variants_named`, `node_modules_commonjs_module_exports_object_wrapper_define_properties_named`, `node_modules_commonjs_module_exports_object_wrapper_define_properties_variants_named`, `node_modules_commonjs_module_exports_object_wrapper_define_property_named`, `node_modules_commonjs_module_exports_object_wrapper_define_property_variants_named`, `node_modules_commonjs_module_exports_object_wrapper_assign_named`, `node_modules_commonjs_module_exports_object_wrapper_assign_variants_named`, `node_modules_commonjs_module_exports_object_define_property_default`, `node_modules_commonjs_module_exports_object_from_entries_default`, `node_modules_commonjs_module_exports_dynamic_computed`, `node_modules_commonjs_module_exports_object_from_entries_named`, `node_modules_commonjs_module_exports_object_from_entries_computed_named`, `node_modules_commonjs_module_exports_object_from_entries_identifier_named`, `node_modules_commonjs_module_exports_object_from_entries_require_values`, `node_modules_commonjs_module_exports_object_from_entries_object_entries_named`, `node_modules_commonjs_module_exports_object_from_entries_object_entries_identifier_named`, `node_modules_commonjs_module_exports_object_wrapper_from_entries_named`, `node_modules_commonjs_module_exports_object_wrapper_from_entries_variants_named`, `node_modules_commonjs_module_exports_object_wrapper_from_entries_object_entries_identifier_variants_named`, `node_modules_commonjs_module_exports_object_runtime_defaults`, `node_modules_commonjs_module_exports_object_wrappers_named`, `node_modules_commonjs_module_exports_object_set_prototype_named`, `node_modules_commonjs_module_exports_object_spread_named`, `node_modules_commonjs_module_exports_object_getter_named`, `node_modules_commonjs_object_spread_default`, `node_modules_commonjs_module_exports_value_chains`, `node_modules_commonjs_module_exports_object_default`, `node_modules_commonjs_module_exports_nested_object_default`, `node_modules_commonjs_module_exports_object_function`, `node_modules_commonjs_module_exports_object_arrow`, `node_modules_commonjs_module_exports_object_method`, `node_modules_commonjs_module_exports_object_literals`, `node_modules_commonjs_module_exports_function`, `node_modules_commonjs_module_exports_arrow`, `node_modules_commonjs_module_exports_identifier`, `node_modules_commonjs_module_exports_primitives`, `node_modules_commonjs_require_named`, `node_modules_commonjs_require_direct_member`, `node_modules_commonjs_require_direct_function`, `node_modules_commonjs_require_direct_value`, `node_modules_commonjs_require_destructure`, `node_modules_commonjs_require_function`, `node_modules_commonjs_relative_require`, `node_modules_commonjs_relative_require_default`, `node_modules_commonjs_relative_require_direct_default`, `node_modules_commonjs_relative_require_member_default`, `node_modules_commonjs_module_require`, `node_modules_commonjs_require_alias`, `node_modules_commonjs_require_side_effect`, `node_modules_commonjs_module_metadata`, `node_modules_commonjs_module_metadata_more`, `node_modules_commonjs_module_paths`
- CommonJS package sources can read `__filename` and `__dirname` as lowered string constants. Test: `node_modules_commonjs_wrapper_globals`
- Side-effect-only imports remain runtime graph edges and execute dependency `mod_init` functions before the entry module. Test: `module_side_effect_import`
- Type-only import/export edges contribute declarations without adding runtime `mod_init` calls, so `import type` and `export type ... from` do not trigger side effects. Tests: `module_type_only_import`, `module_type_only_re_export`
- Namespace declarations for scoped values, functions, lifted arrow consts, nested namespaces, namespace member assignment, and fixed-arity spread calls into namespace functions. Test: `namespaces`
- Circular imports don't crash — topo DFS stops at the back-edge

---

## 8. Error handling

- `throw expr` — stringifies `expr` and `longjmp`s to the nearest enclosing `try`. Test: `exceptions`
- `try { } catch (e) { } finally { }` — catch binding is `tsc_str_t* e = tsc_current_error()`
- `new Error(message?, options?, ...ignored)`, callable `Error(message?, options?, ...ignored)`, and the same constructor/callable forms for `TypeError`, `RangeError`, `SyntaxError`, `ReferenceError`, `EvalError`, `URIError`, and `AggregateError` create a narrow Error object subset exposing `.name`, `.message`, `.cause`, `.toString(...ignored)`, `.toLocaleString(...ignored)`, and `.valueOf(...ignored)`. Extra constructor and string/value method arguments are evaluated then ignored where JavaScript ignores them, literal `{ cause }` options are stored as dynamic values, `AggregateError` stores `.errors`, and throwing one of these errors still stringifies into the existing exception string channel. Tests: `error_instances`, `error_constructors`, `error_more_constructors`, `aggregate_error_constructor`, `error_cause`
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
- Common dynamic string/array methods dispatch at runtime for `charAt`, `charCodeAt`, `codePointAt`, `includes`, `indexOf`, `lastIndexOf`, `localeCompare`, `join`, `pop`, variadic `push`, `shift`, variadic `unshift`, `at`, `concat`, `copyWithin`, `fill`, `flat`, `keys`, `values`, `entries`, `normalize`, `padStart`, `padEnd`, `repeat`, `replace`, `replaceAll`, `reverse`, `toReversed`, `toSorted`, `toSpliced`, `with`, `slice`, `split`, `substr`, `substring`, `startsWith`, `endsWith`, `toLowerCase`, `toUpperCase`, `trim`, `trimStart`, `trimEnd`, `toString`, `toLocaleString`, and `valueOf`; dynamic no-op and fixed-input methods evaluate and ignore extra arguments after the JavaScript-consumed inputs for `charAt`, `charCodeAt`, `codePointAt`, `at`, `includes`, `indexOf`, `lastIndexOf`, `startsWith`, `endsWith`, `join`, `pop`, `shift`, `reverse`, `toReversed`, `keys`, `values`, `entries`, `normalize`, `repeat`, `padStart`, `padEnd`, `toUpperCase`, `toLowerCase`, `trim`, `trimStart`, `trimEnd`, dynamic number-formatting methods, and dynamic `valueOf`. Tests: `dynamic_methods`, `dynamic_array_methods`, `dynamic_array_at`, `dynamic_array_copy_within`, `dynamic_array_entries`, `dynamic_array_fill`, `dynamic_array_flat`, `dynamic_array_keys_values`, `array_includes_same_value_zero`, `dynamic_array_slice_reverse`, `dynamic_array_to_reversed`, `dynamic_array_to_sorted`, `dynamic_array_to_spliced`, `dynamic_array_to_string`, `dynamic_array_value_of`, `dynamic_array_with`, `dynamic_last_index_of`, `dynamic_search_positions`, `dynamic_string_at`, `dynamic_string_code_point_at`, `dynamic_string_concat`, `dynamic_string_locale_compare`, `dynamic_string_normalize`, `dynamic_string_pad_repeat`, `dynamic_string_replace`, `dynamic_string_split`, `dynamic_string_split_limit`, `dynamic_string_split_regex`, `dynamic_string_substr`, `dynamic_string_substring`, `dynamic_string_trim_edges`, `dynamic_number_to_string`, `number_to_fixed`, `number_to_exponential`, `number_to_precision`
- Dynamic number receivers support `.toString(radix?)` through `tsc_value_method_to_string`, plus `.toFixed(fractionDigits?)`, `.toExponential(fractionDigits?)`, and `.toPrecision(precision?)` through number-only runtime bridges. Tests: `dynamic_number_to_string`, `number_to_fixed`, `number_to_exponential`, `number_to_precision`
- Dynamic array `toString()` / `toLocaleString()` use comma-join stringification, including nested arrays and `null`/`undefined` empty slots. Test: `dynamic_array_to_string`
- Dynamic values can be coerced into typed `number`, `boolean`, `string`, and array destinations using runtime unbox/conversion helpers. Test: `dynamic_coercions`
- Basic discriminated unions over interface-shaped dynamic object storage work with literal discriminants, including `if` branches, `switch` cases, and nested dotted discriminant paths, with typed field reads through dynamic coercion. Tests: `discriminated_unions`, `discriminated_union_switch`, `discriminated_union_nested`
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
- `new Proxy(target, handler)` and `Proxy.revocable(target, handler)` support dynamic object traps for `get`, `set`, `has`, `deleteProperty`, `defineProperty`, `getOwnPropertyDescriptor`, `ownKeys`, `getPrototypeOf`, `setPrototypeOf`, `isExtensible`, and `preventExtensions`, plus function `apply` traps through dynamic `Reflect.apply` and bounded `construct` traps through dynamic `Reflect.construct(proxyCtor, args)`. `Object.keys(proxy)` filters trapped `ownKeys` through `getOwnPropertyDescriptor(...).enumerable`, matching descriptor semantics instead of returning every trapped key; `ownKeys` trap result validation rejects duplicate keys, missing non-configurable target keys, and extra/missing keys on non-extensible targets; `getOwnPropertyDescriptor` trap result validation rejects invalid result types, hidden non-configurable keys, hidden or invented keys on non-extensible targets, invalid non-configurable descriptor claims, descriptor-kind mismatches, and changed fixed data values; `get`, `set`, and `defineProperty` trap result validation rejects fixed-data/accessor violations, additions to non-extensible targets, and invalid non-configurable descriptor claims; `has` and `deleteProperty` trap result validation rejects hiding or deleting non-configurable keys and existing keys on non-extensible targets; prototype/extensibility validation rejects invalid or inconsistent `getPrototypeOf`, `setPrototypeOf`, `isExtensible`, and `preventExtensions` trap results. Tests: `proxy`, `proxy-ownkeys`, `proxy_traps`, `proxy_ownkeys_invariants`, `proxy_descriptor_invariants`, `proxy_get_set_define_invariants`, `proxy_has_delete_invariants`, `proxy_prototype_extensibility_invariants`, `proxy_construct`
- `JSON.stringify(dynamic)` recurses through dynamic arrays/objects; object properties whose values are `undefined` or boxed function identities are omitted, while array slots still emit `null`. Tests: `dynamic_values`, `object_descriptor_defaults`

---

## 10. Node stdlib (sync subset)

### `fs`
- `fs.readFileSync(path)` → `tsc_fs_read_file_sync`
- `fs.writeFileSync(path, data)` → `tsc_fs_write_file_sync`
- `fs.existsSync(path)` → `tsc_fs_exists_sync`
- `fs.accessSync(path, mode?)` → `tsc_fs_access_sync` / `tsc_fs_access_sync_mode`, with POSIX `fs.constants.{F_OK,R_OK,W_OK,X_OK}` support for global, namespace, and named-import forms. Supported sync fs calls also route from named imports such as `import { accessSync } from "fs"`. Tests: `fs_access_sync`, `fs_access_modes`
- Supported fs path arguments accept strings, Buffers, and `file:` URL objects in the bounded `PathLike` subset for sync, named-import, and immediate-promise calls; Buffer paths lower through the existing UTF-8 buffer-to-string coercion, and file URLs lower through their filesystem pathname. Tests: `fs_buffer_path_like`, `fs_file_url_path_like`
- `fs.constants.COPYFILE_EXCL`, `COPYFILE_FICLONE`, and `COPYFILE_FICLONE_FORCE` are exposed. `fs.copyFileSync(src, dest, mode?)` and immediate `fs.promises.copyFile(src, dest, mode?)` accept optional flags, with `COPYFILE_EXCL` enforcing no overwrite. Test: `fs_copy_flags`
- `fs.cpSync(src, dest[, { recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps }])` and immediate-settled `fs.promises.cp(src, dest[, options])` copy regular files, recursive directory trees, and symlinks in a bounded subset, with `force: false` skip behavior, `errorOnExist` errors only when `force` is false, numeric copy flags such as `COPYFILE_EXCL` for regular files, literal `preserveTimestamps` support for regular-file copies, default resolved symlink targets, verbatim symlink target preservation, and dereferenced symlink copies. Tests: `fs_cp_recursive`, `fs_cp_options`, `fs_cp_symlink_options`
- `fs.readdirSync(path[, "utf8" | "buffer" | { encoding }])` → `tsc_fs_readdir_sync` / `tsc_fs_readdir_buffer_sync`, returning string arrays for the bounded UTF-8 encoding subset and Buffer arrays for explicit Buffer encoding; `fs.readdirSync(path, { recursive: true })` and immediate-settled `fs.promises.readdir(path, { recursive: true })` return recursive relative string results, with Buffer results for `{ encoding: "buffer", recursive: true }`; `fs.readdirSync(path, { withFileTypes: true })` and immediate-settled `fs.promises.readdir(path, { withFileTypes: true })` return a bounded `Dirent` subset with `name`, `isFile(...ignored)`, `isDirectory(...ignored)`, `isSymbolicLink(...ignored)`, `isBlockDevice(...ignored)`, `isCharacterDevice(...ignored)`, `isFIFO(...ignored)`, and `isSocket(...ignored)`. Tests: `fs_readdir_options`, `fs_readdir_buffer_options`, `fs_readdir_recursive`, `fs_readdir_dirents`
- `fs.statSync(path[, { bigint: false, throwIfNoEntry: true }])` and immediate-settled `fs.promises.stat(path[, { bigint: false, throwIfNoEntry: true }])` return a small typed `Stats` subset with `dev`, `ino`, `size`, `mode`, `nlink`, `uid`, `gid`, `rdev`, `blksize`, `blocks`, numeric `atimeMs` / `mtimeMs` / `ctimeMs` / `birthtimeMs` timestamps, Date-object `atime` / `mtime` / `ctime` / `birthtime` timestamps, `isFile(...ignored)`, `isDirectory(...ignored)`, `isSymbolicLink(...ignored)`, `isBlockDevice(...ignored)`, `isCharacterDevice(...ignored)`, `isFIFO(...ignored)`, and `isSocket(...ignored)`. Tests: `fs_stat`, `fs_stats_kinds`, `fs_stat_options`, `fs_stats_times`, `fs_stats_metadata`
- `fs.lstatSync(path[, { bigint: false, throwIfNoEntry: true }])` and immediate-settled `fs.promises.lstat(path[, { bigint: false, throwIfNoEntry: true }])` return the same small typed `Stats` subset without following symlinks. Tests: `fs_lstat`, `fs_stats_kinds`, `fs_stat_options`, `fs_stats_times`, `fs_stats_metadata`
- `fs.realpathSync(path[, "utf8" | "buffer" | { encoding }])` and immediate-settled `fs.promises.realpath(path[, "utf8" | "buffer" | { encoding }])` resolve paths through the host filesystem for the bounded UTF-8 and explicit Buffer encoding subset. Tests: `fs_realpath`, `fs_link_path_encoding_options`
- `fs.readlinkSync(path[, "utf8" | "buffer" | { encoding }])` and immediate-settled `fs.promises.readlink(path[, "utf8" | "buffer" | { encoding }])` read symlink targets through the host filesystem for the bounded UTF-8 and explicit Buffer encoding subset. Tests: `fs_readlink`, `fs_link_path_encoding_options`
- `fs.symlinkSync(target, path[, "file" | "dir" | "junction"])` and immediate-settled `fs.promises.symlink(target, path[, "file" | "dir" | "junction"])` create host filesystem symlinks; the literal type argument is accepted for portable Node call sites and is POSIX-inert in this runtime. Tests: `fs_symlink`, `fs_symlink_type_options`
- `fs.linkSync(existingPath, newPath)` and immediate-settled `fs.promises.link(existingPath, newPath)` create host filesystem hard links. Test: `fs_link`
- `fs.mkdtempSync(prefix[, "utf8" | "buffer" | { encoding }])` and immediate-settled `fs.promises.mkdtemp(prefix[, "utf8" | "buffer" | { encoding }])` create temporary directories from a prefix for the bounded UTF-8 and explicit Buffer encoding subset. Tests: `fs_mkdtemp`, `fs_mkdtemp_encoding_options`
- `fs.truncateSync(path, len?)` and immediate-settled `fs.promises.truncate(path, len?)` truncate files by path. Test: `fs_truncate`
- `fs.utimesSync(path, atime, mtime)` and immediate-settled `fs.promises.utimes(path, atime, mtime)` update file access/modification timestamps for numeric seconds and `Date` values. Test: `fs_utimes`
- `fs.lutimesSync(path, atime, mtime)` and immediate-settled `fs.promises.lutimes(path, atime, mtime)` update symlink access/modification timestamps without following the target. Test: `fs_lutimes`
- `fs.chownSync(path, uid, gid)` and immediate-settled `fs.promises.chown(path, uid, gid)` change numeric uid/gid ownership through POSIX `chown`; `chownSync` also routes from named imports. Test: `fs_chown`
- `fs.lchownSync(path, uid, gid)` and immediate-settled `fs.promises.lchown(path, uid, gid)` change numeric uid/gid ownership on symlink paths through POSIX `lchown`. Test: `fs_lchown`
- `fs.chmodSync(path, mode)` and immediate-settled `fs.promises.chmod(path, mode)` change numeric file modes. Test: `fs_chmod`
- `fs.mkdirSync(path)`, `unlinkSync(path)`, `rmSync(path)`, `rmdirSync(path)`, `appendFileSync(path, data)`, `cpSync(src, dest, options?)`, `copyFileSync(src, dest, mode?)`, and `renameSync(oldPath, newPath)` are implemented for path-only calls, string/Buffer/file-URL paths, string data, Buffer data for write/append, and bounded recursive regular-file/directory/symlink copies. Read/write/append/readdir/realpath/readlink/mkdtemp accept bounded UTF-8 string or object-literal encoding options, `readFileSync` and immediate `fs.promises.readFile` accept explicit `"buffer"` / `null` / `{ encoding: "buffer" | null }` options and return Buffer results, `readdir`/`realpath`/`readlink`/`mkdtemp` accept explicit `"buffer"` / `{ encoding: "buffer" }` options and return Buffer results, `readFileSync` and immediate `fs.promises.readFile` accept literal `{ flag: "r" | "rs" | "r+" | "rs+" }` options, `writeFileSync` and immediate `fs.promises.writeFile` accept literal `{ flag: "w" | "wx" | "w+" | "wx+" | "a" | "ax" | "a+" | "ax+" | "as" | "as+" | "r+" | "rs+" }` options for overwrite, exclusive-create, append, and update-in-place writes, `appendFileSync` and immediate `fs.promises.appendFile` accept literal `{ flag: "a" | "ax" | "a+" | "ax+" | "as" | "as+" }` append flags, write/append accept numeric `{ mode }` for newly created files and literal `{ flush }` compatibility options, readdir accepts literal `{ recursive: true }` and `{ withFileTypes: true }` options, `mkdir` accepts bounded numeric mode options and `{ recursive: boolean, mode?: number }` object-literal options, `cp` accepts bounded `{ recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps }` options, `rm` accepts bounded `{ recursive: boolean, force: boolean, maxRetries?: number, retryDelay?: number }` object-literal options, and `rmdir` accepts bounded `{ recursive: boolean, maxRetries?: number, retryDelay?: number }` object-literal options for sync and immediate-settled promise calls. Tests: `fs_sync_mutation`, `fs_buffer_path_like`, `fs_file_url_path_like`, `fs_write_file_flags`, `fs_file_flag_options`, `fs_read_file_plus_flags`, `fs_write_append_mode_options`, `fs_read_file_buffer_options`, `fs_read_file_null_buffer_options`, `fs_readdir_buffer_options`, `fs_mkdir_mode_options`, `fs_cp_recursive`, `fs_cp_options`, `fs_cp_symlink_options`, `fs_copy_rename`, `fs_copy_flags`, `fs_append`, `fs_buffer_write_append`, `fs_readdir_options`, `fs_readdir_recursive`, `fs_readdir_dirents`, `fs_link_path_encoding_options`, `fs_mkdtemp_encoding_options`, `fs_recursive_options`, `fs_encoding_options`
- Test: `fs_roundtrip`
- `fs.promises.readFile(path[, "utf8" | "buffer" | null | { encoding, flag }])`, `writeFile(path, data[, { flag, mode, flush }])`, `appendFile(path, data[, { flag: "a" | "ax" | "a+" | "ax+" | "as" | "as+", mode, flush }])`, `readdir(path[, "utf8" | "buffer" | { encoding } | { recursive: true } | { withFileTypes: true }])`, `stat(path)`, `lstat(path)`, `realpath(path[, "utf8" | "buffer" | { encoding }])`, `readlink(path[, "utf8" | "buffer" | { encoding }])`, `symlink(target, path[, "file" | "dir" | "junction"])`, `link(existingPath, newPath)`, `mkdtemp(prefix[, "utf8" | "buffer" | { encoding }])`, `truncate(path, len?)`, `utimes(path, atime, mtime)`, `lutimes(path, atime, mtime)`, `chown(path, uid, gid)`, `lchown(path, uid, gid)`, `chmod(path, mode)`, `access(path, mode?)`, `mkdir(path[, mode | { recursive, mode }])`, `unlink(path)`, `rm(path)`, `rmdir(path[, { recursive }])`, `cp(src, dest[, options])`, `copyFile(src, dest, mode?)`, and `rename(oldPath, newPath)` are implemented as an immediate-settled subset on top of the sync runtime, with string/Buffer/file-URL paths, `readFile` returning Buffer for explicit Buffer/null encodings, `realpath`/`readlink`/`mkdtemp` returning Buffer for explicit Buffer encodings, and `writeFile` / `appendFile` accepting string or Buffer data, applying numeric `{ mode }` only to newly created files, and accepting literal `{ flush }` compatibility options. Successful calls return fulfilled `Promise<T>` values usable with the settled Promise `.then(...)` lowering, and sync filesystem throws are converted into rejected Promise records for `.catch(...)`; real libuv-backed async scheduling and broader options objects remain deferred. Tests: `fs_promises`, `fs_promises_import`, `fs_promises_mutation`, `fs_promises_rejections`, `fs_buffer_path_like`, `fs_file_url_path_like`, `fs_write_file_flags`, `fs_file_flag_options`, `fs_write_append_mode_options`, `fs_read_file_buffer_options`, `fs_read_file_null_buffer_options`, `fs_cp_recursive`, `fs_cp_options`, `fs_cp_symlink_options`, `fs_copy_rename`, `fs_copy_flags`, `fs_append`, `fs_buffer_write_append`, `fs_readdir_options`, `fs_readdir_buffer_options`, `fs_readdir_recursive`, `fs_readdir_dirents`, `fs_access_modes`, `fs_stat`, `fs_lstat`, `fs_realpath`, `fs_readlink`, `fs_link_path_encoding_options`, `fs_symlink`, `fs_symlink_type_options`, `fs_link`, `fs_mkdtemp`, `fs_mkdtemp_encoding_options`, `fs_truncate`, `fs_utimes`, `fs_lutimes`, `fs_chown`, `fs_lchown`, `fs_chmod`, `fs_mkdir_mode_options`, `fs_recursive_options`, `fs_encoding_options`

### `path`
- `path.join(...parts)` → `tsc_path_join`
- `path.resolve(...parts)` → `tsc_path_resolve` (against `getcwd()`)
- `path.normalize(path, ...ignored)`, `path.isAbsolute(path, ...ignored)`, `path.relative(from, to, ...ignored)`, `path.toNamespacedPath(path, ...ignored)`, `path.parse(path, ...ignored)`, and `path.format(pathObject, ...ignored)` implement a bounded POSIX subset for segment cleanup, leading-slash absolute detection, relative path construction, POSIX no-op namespacing, and dynamic parsed-path records while evaluating ignored extra arguments after consumed inputs. `path.sep`, `path.delimiter`, `path.posix.*`, and named `posix` imports expose the same POSIX subset. Named and namespace imports from `"path"` / `"node:path"` route to the same supported subset. Tests: `path_normalize`, `path_import`, `path_constants`, `path_relative`, `path_to_namespaced`, `path_parse_format`, `path_posix`
- `path.basename(path, suffix?, ...ignored)` / `dirname(path, ...ignored)` / `extname(path, ...ignored)`. Test: `path_basename_suffix`
- Test: `fs_roundtrip`

### `os`
- `os.platform(...ignored)` / `type(...ignored)` / `release(...ignored)` / `version(...ignored)` / `endianness(...ignored)` / `machine(...ignored)` / `arch(...ignored)` / `hostname(...ignored)` / `tmpdir(...ignored)` / `homedir(...ignored)` / `cpus(...ignored)` / `availableParallelism(...ignored)` / `totalmem(...ignored)` / `freemem(...ignored)` / `uptime(...ignored)` / `loadavg(...ignored)` / `userInfo()`, `os.EOL`, and `os.devNull`, with namespace and named imports from `"os"` / `"node:os"` for the supported subset.
- Runtime: `tsc_os_*`. Tests: `stdlib_os`, `os_more`, `os_dev_null`, `os_host_more`, `os_system_stats`, `os_user_info`

### `crypto`
- `crypto.createHash("sha1" | "sha256" | "sha512").update(data).digest("hex" | "base64")` backed by OpenSSL SHA helpers from the global `crypto` object, named imports, and namespace imports from `"crypto"` / `"node:crypto"`. `Hash.update(...)` accepts strings and Buffers. Tests: `crypto_sha256`, `crypto_hash_more`, `crypto_import`, `crypto_digest_base64`
- `crypto.randomBytes(size)` returns a Buffer filled by OpenSSL `RAND_bytes` with a libc `rand()` fallback, through the global crypto object and named/namespace imports from `"crypto"` / `"node:crypto"`. Test: `crypto_random_bytes`
- `crypto.randomUUID()` returns RFC 4122 version 4 UUID strings through the global crypto object and named/namespace imports from `"crypto"` / `"node:crypto"`. Test: `crypto_random_uuid`

### `EventEmitter`
- `new EventEmitter(...ignored)` creates a synchronous listener registry from the global constructor, named imports from `"events"` / `"node:events"`, or namespace imports such as `events.EventEmitter`. `on`, `addListener`, `prependListener`, `once`, `prependOnceListener`, `off`, `removeListener`, `removeAllListeners`, `emit`, `listenerCount(eventName, listener?)`, `listeners(eventName)`, `rawListeners(eventName)`, `eventNames(...ignored)`, `setMaxListeners`, `getMaxListeners(...ignored)`, and module-level `listenerCount(emitter, eventName, listener?, ...ignored)` / `events.listenerCount(emitter, eventName, listener?, ...ignored)` / `EventEmitter.listenerCount(emitter, eventName, listener?, ...ignored)` / `events.EventEmitter.listenerCount(emitter, eventName, listener?, ...ignored)` / `getEventListeners(emitter, eventName, ...ignored)` / `events.once(emitter, eventName)` / `setMaxListeners(count, emitter)` / `getMaxListeners(emitter, ...ignored)` are implemented for string event names and typed listener callbacks. `EventEmitter.defaultMaxListeners`, `events.defaultMaxListeners`, and namespace/static constructor reads share a mutable default listener limit used by emitters without an own `setMaxListeners(...)` value. Emitted arguments are boxed as dynamic values and coerced into each listener's declared parameters by generated adapters. Listener inspection returns stable boxed function identities suitable for `typeof`, stringification, `Object.is`, and strict equality checks. `rawListeners` returns ordinary listener identities directly and once-listener wrapper identities with a `.listener` back-pointer to the original listener. `events.once(...)` returns a Promise fulfilled by the next matching synchronous `emit` with an array of emitted args, or rejected by an intervening `"error"` event. Emitting `"error"` with no registered listener throws the first emitted argument string, duplicate `off` / `removeListener` calls remove the most recently added matching listener, and once listeners are removed before invocation so reentrant emits do not call them twice. Tests: `event_emitter`, `event_emitter_import`, `event_emitter_more`, `event_emitter_namespace`, `event_emitter_max_listeners`, `event_emitter_default_max_listeners`, `event_emitter_listener_count_filter`, `event_emitter_error_event`, `event_emitter_remove_latest`, `event_emitter_once_reentrant`, `event_emitter_once_promise`, `event_emitter_listeners`, `event_emitter_raw_listeners`, `event_emitter_static_listener_count`

### `Event` / `EventTarget`
- `new EventTarget(...ignored)` creates a synchronous listener registry for string event names. `addEventListener(type, listener[, options])` registers typed `(event: Event) => void` callbacks while suppressing duplicate listener identities, accepts literal boolean options and literal `{ once, capture, passive }` option objects, and removes `{ once: true }` listeners before invocation. `removeEventListener(type, listener[, options])` removes the matching identity while accepting literal boolean/object options as compatibility flags, and `dispatchEvent(event)` synchronously invokes a snapshot of still-registered matching listeners. `new Event(type, { cancelable?: boolean })` supports `type`, `target`, `currentTarget`, `defaultPrevented`, `cancelable`, and `preventDefault(...ignored)`. `dispatchEvent(...)` returns `false` only when a cancelable event has had default prevented. Tests: `event_target`, `event_target_options`

### `dns`
- `dns.lookup(hostname, callback)`, `dns.lookup(hostname, 4|6|0, callback)`, `dns.lookup(hostname, { family, all, hints, verbatim, order }, callback)`, and `dns.promises.lookup(hostname[, 4|6|0 | { family, all, hints, verbatim, order }])` are implemented as immediate subsets for global `dns`, named imports, named `promises` imports, and namespace imports from `"dns"` / `"node:dns"`. They resolve through host `getaddrinfo`, support bounded literal family selection for `0`, `4`, or `6`, expose `dns.ADDRCONFIG`, `dns.V4MAPPED`, and `dns.ALL` hint constants, pass `null`, the first IPv4/IPv6 address, and family `4` or `6` on single callback success, and pass an error string as the first callback argument on callback failure. `{ all: true }` returns an array of dynamic `{ address, family }` result objects for callback and Promise forms. Literal `verbatim` / `order` options are accepted in this immediate subset without adding libuv scheduling. The single-result Promise form returns a fulfilled dynamic `{ address, family }` object or a rejected Promise with the lookup error string. Tests: `dns_lookup`, `dns_lookup_options`, `dns_lookup_option_forms`, `dns_promises_lookup`, `dns_lookup_all`, `dns_lookup_hints`

### `net`
- `net.isIP(input)`, `net.isIPv4(input)`, and `net.isIPv6(input)` are implemented as a pure address-classification subset for global `net`, named imports, and namespace imports from `"net"` / `"node:net"`, backed by host `inet_pton`. Test: `net_is_ip`

### `child_process`
- `child_process.exec(command, { cwd?, env?, encoding?, shell?, maxBuffer?, timeout?, killSignal? }, callback)` / `execFile(file, argsOrOptionsOrCallback, optionsOrCallback?, callback?)` from `"child_process"` / `"node:child_process"` have immediate UTF-8 callback subsets: commands execute synchronously under the hood, accept explicit literal UTF-8 `encoding` options, accept `execFile(file, callback)` when no args array is needed, accept the options object as the second argument when no args array is needed, optionally route `exec` through a literal shell path string and `execFile` through `/bin/sh -c` for literal `shell: true` or a literal shell path string while preserving direct `execvp` routing for literal `shell: false`, optionally run in the requested child working directory, optionally with a literal string `env` overlay, optionally pass literal `argv0` to `execFile`, accept POSIX-inert `windowsHide` and `windowsVerbatimArguments`, optionally apply POSIX `uid` / `gid` before `execvp`, optionally truncate captured output and report `error: "ENOBUFS"` for numeric `maxBuffer`, optionally time out with `error: "ETIMEDOUT"` for numeric `timeout` and literal string or numeric `killSignal`, propagate child setup errors such as `ENOENT` to the callback `error`, then invoke the callback with `error`, `stdout`, and `stderr` strings. Tests: `child_process_exec_callbacks`, `child_process_exec_callbacks_cwd`, `child_process_exec_callback_error`, `child_process_exec_callback_encoding`, `child_process_exec_callback_timeout`, `child_process_numeric_kill_signal`, `child_process_exec_shell_string`, `child_process_env_options`, `child_process_options_second_arg`, `child_process_exec_file_shell`, `child_process_shell_string`, `child_process_shell_false`, `child_process_exec_file_callback_no_args`, `child_process_exec_file_callback_error`, `child_process_argv0_options`, `child_process_windows_hide_option`, `child_process_windows_verbatim_option`, `child_process_uid_gid_options`, `child_process_max_buffer_options`
- `child_process.execSync(command, { cwd?, input?, encoding?, env?, shell?, maxBuffer?, timeout?, killSignal? })` / named `execSync(command, { cwd?, input?, encoding?, env?, shell?, maxBuffer?, timeout?, killSignal? })` from `"child_process"` / `"node:child_process"` executes a shell command synchronously, optionally changes the child working directory, optionally writes UTF-8 stdin, optionally applies a literal string `env` overlay, optionally selects a literal shell path string, accepts POSIX-inert `windowsHide`, optionally applies POSIX `uid` / `gid` before `execvp`, optionally panics when captured output exceeds numeric `maxBuffer`, optionally times out with `SIGTERM`, `SIGKILL`, or matching numeric `killSignal` for numeric `timeout`, captures stdout, returns it as a Buffer by default or for literal `encoding: "buffer"` and as a string for literal `encoding: "utf8"` / `"utf-8"`, and panics on command failure or timeout in this narrow subset. Tests: `child_process_exec_sync`, `child_process_exec_sync_options`, `child_process_exec_sync_encoding`, `child_process_exec_sync_buffer_encoding`, `child_process_env_options`, `child_process_exec_shell_string`, `child_process_exec_sync_timeout_options`, `child_process_numeric_kill_signal`, `child_process_windows_hide_option`, `child_process_uid_gid_options`, `child_process_max_buffer_options`
- `child_process.execFileSync(file, argsOrOptions?, options?)` / named `execFileSync(file, argsOrOptions?, options?)` from `"child_process"` / `"node:child_process"` executes a binary synchronously with `fork` / `execvp`, accepts the options object as the second argument when no args array is needed, optionally routes through `/bin/sh -c` for literal `shell: true` or a literal shell path string while preserving direct `execvp` routing for literal `shell: false`, optionally changes the child working directory, optionally writes UTF-8 stdin, optionally applies a literal string `env` overlay, optionally passes literal `argv0`, accepts POSIX-inert `windowsHide` and `windowsVerbatimArguments`, optionally applies POSIX `uid` / `gid` before `execvp`, optionally panics when captured output exceeds numeric `maxBuffer`, optionally times out with `SIGTERM`, `SIGKILL`, or matching numeric `killSignal` for numeric `timeout`, captures stdout while draining stderr internally, returns stdout as a Buffer by default or for literal `encoding: "buffer"` and as a string for literal `encoding: "utf8"` / `"utf-8"`, and panics on command failure or timeout in this narrow subset. Tests: `child_process_exec_file_sync`, `child_process_exec_file_sync_cwd`, `child_process_exec_file_sync_input`, `child_process_exec_sync_encoding`, `child_process_exec_sync_buffer_encoding`, `child_process_env_options`, `child_process_exec_file_sync_options_second_arg`, `child_process_exec_file_shell`, `child_process_shell_string`, `child_process_shell_false`, `child_process_exec_file_sync_stderr_pipe`, `child_process_exec_sync_timeout_options`, `child_process_numeric_kill_signal`, `child_process_argv0_options`, `child_process_windows_hide_option`, `child_process_windows_verbatim_option`, `child_process_uid_gid_options`, `child_process_max_buffer_options`
- `child_process.spawnSync(file, argsOrOptions, options?)` / named `spawnSync(...)` from `"child_process"` / `"node:child_process"` executes a binary synchronously with `fork` / `execvp`, accepts the options object as the second argument when no args array is needed, accepts explicit `stdio: "pipe"`, `stdio: "ignore"`, `stdio: "inherit"`, and three-entry `"pipe"` / `"ignore"` / `"inherit"` tuple forms with `null` / `undefined` entries treated as default pipes and matching numeric fd entries `0` / `1` / `2` treated as inherited standard fds for stdin piping/ignoring/inheritance, stdout/stderr capture, null result fields, or inherited parent output, optionally routes through `/bin/sh -c` for literal `shell: true` or a literal shell path string while preserving direct `execvp` routing for literal `shell: false`, optionally starts the child in a new POSIX session for literal `detached: true` while preserving attached/default behavior for literal `detached: false`, optionally changes the child working directory, optionally writes UTF-8 stdin, optionally applies a literal string `env` overlay, optionally passes literal `argv0`, accepts POSIX-inert `windowsHide` and `windowsVerbatimArguments`, optionally applies POSIX `uid` / `gid` before `execvp`, optionally truncates captured output and reports `error: "ENOBUFS"` for numeric `maxBuffer`, optionally times out with `SIGTERM`, `SIGKILL`, or matching numeric `killSignal` and `error: "ETIMEDOUT"` for numeric `timeout`, captures stdout/stderr as UTF-8 strings when piped, preserves nonzero child exit statuses without throwing, reports signal termination as `status: null` with a signal name, reports child setup / `execvp` failures through `error`, and returns a dynamic result object with `status`, `stdout`, `stderr`, `pid`, `output`, `signal`, and `error` fields. Tests: `child_process_spawn_sync`, `child_process_spawn_sync_cwd`, `child_process_spawn_sync_input`, `child_process_spawn_sync_result_metadata`, `child_process_spawn_sync_nonzero_status`, `child_process_spawn_sync_signal`, `child_process_spawn_sync_exec_error`, `child_process_env_options`, `child_process_options_second_arg`, `child_process_spawn_sync_shell`, `child_process_shell_string`, `child_process_shell_false`, `child_process_spawn_sync_stdio_pipe`, `child_process_spawn_sync_stdio_ignore`, `child_process_spawn_sync_stdio_inherit`, `child_process_spawn_sync_stdio_stdin`, `child_process_spawn_sync_stdio_default_entries`, `child_process_spawn_sync_stdio_fd`, `child_process_spawn_sync_detached`, `child_process_spawn_sync_detached_false`, `child_process_spawn_sync_timeout`, `child_process_spawn_sync_kill_signal`, `child_process_numeric_kill_signal`, `child_process_argv0_options`, `child_process_windows_hide_option`, `child_process_windows_verbatim_option`, `child_process_uid_gid_options`, `child_process_max_buffer_options`

### `Buffer`
- `Buffer.from(string[, "utf8" | "hex" | "base64"])`, `Buffer.from(number[])`, `Buffer.from(existingBuffer)`, `Buffer.alloc(size, fill?)`, `Buffer.allocUnsafe(size)`, `Buffer.allocUnsafeSlow(size)`, `Buffer.concat(list, totalLength?)`, `Buffer.isBuffer(value, ...ignored)`.
- `Buffer.byteLength(value, encoding?, ...ignored)`, `Buffer.isEncoding(encoding, ...ignored)`, static `Buffer.compare(a, b, ...ignored)`, and instance `buf.compare(other)` are implemented for the supported UTF-8/hex/base64 Buffer subset, including `"utf-8"` aliases.
- Buffer instances expose `.length`, numeric byte indexing/get-set, `.toString("utf8" | "hex")`, `.slice()`, `.subarray()`, `.fill()`, `.write()`, signed/unsigned integer and float/double reads/writes, `.swap16(...ignored)` / `.swap32(...ignored)` / `.swap64(...ignored)`, `.copy()`, number/string/Buffer `.indexOf()` / `.lastIndexOf()` / `.includes()`, and `.equals(other, ...ignored)`. Tests: `buffer`, `buffer_fill`, `buffer_write`, `buffer_uint8_io`, `buffer_uint_multi_io`, `buffer_int_io`, `buffer_float_io`, `buffer_swap`, `buffer_copy`, `buffer_search`, `buffer_search_more`
- Buffer instances expose `.toLocaleString(...ignored)` as UTF-8 text, `.toJSON(...ignored)` as `{ type: "Buffer", data: number[] }`, `.toString(encoding?, ...ignored)`, `.valueOf(...ignored)` identity, and numeric byte indexes through `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)`, `Reflect.ownKeys`, `Reflect.getOwnPropertyDescriptor`, `Reflect.get`, `Reflect.has`, and the `in` operator; `length` remains non-own but is visible to `Reflect.get` / `Reflect.has` / `in`. Tests: `buffer_to_json`, `buffer_object_methods`

### `URL`
- `new URL(input)` parses absolute URLs with `href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, and `origin` fields. Test: `url_parse`
- `new URL(input, base)` resolves root-relative, scheme-relative, query/hash-only, and simple relative-path inputs against an absolute base URL. Test: `url_base`
- `URL.canParse(input)` / `URL.canParse(input, base)` checks whether the supported absolute or base-resolved URL subset can be constructed without throwing. Tests: `url_can_parse`, `url_base`
- URL instances expose `.toString(...ignored)`, `.toJSON(...ignored)`, `.toLocaleString(...ignored)`, `.valueOf(...ignored)`, and empty own-property results through `Object.keys`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)`, `Reflect.ownKeys`, and `Reflect.getOwnPropertyDescriptor`. Test: `url_object_methods`

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
- `process.argv0`, `process.execPath`, `process.execArgv`, and read-only `process.title` expose basic argv metadata.
- `process.env.VAR` → `tsc_process_env_get(VAR)` (getenv)
- `process.env["VAR"]` — same as above via element access
- `process.env.VAR = value`, `process.env["VAR"] = value`, and `delete process.env[...]` mutate the local process environment through `setenv` / `unsetenv`.
- `process.stdout.write(string | Buffer)` and `process.stderr.write(string | Buffer)` write directly to stdout/stderr and return a boolean write-success flag.
- `process.cwd()` → `tsc_process_cwd`
- `process.chdir(directory)` → `tsc_process_chdir`
- `process.platform`, `process.arch`, `process.pid`, `process.ppid`, `process.version`, `process.versions`, `process.release`, `process.features`, and `process.uptime(...ignored)` expose synchronous process metadata, with ignored extra-argument evaluation where Node ignores extras.
- `process.hrtime([previous], ...ignored)` returns a monotonic `[seconds, nanoseconds]` pair, with previous-mark diff support, and `process.hrtime.bigint(...ignored)` returns a monotonic nanosecond BigInt timestamp.
- `process.nextTick(callback, ...args)` supports a bounded callback queue with up to three typed callback arguments, drained after module initialization and before process exit.
- `setTimeout(callback, 0, ...args)` plus explicit `undefined` / `void 0` / `-0` delay forms support a bounded zero-delay callback queue with up to three typed callback arguments, drained after `process.nextTick` and `queueMicrotask` callbacks before `setImmediate` and process exit. It returns a numeric handle accepted by `clearTimeout(handle)` or `clearInterval(handle)` before the drain; omitted or undefined-valued clear handles are no-op clears that still evaluate ignored arguments.
- `setImmediate(callback, ...args)` supports a bounded callback queue with up to three typed callback arguments, drained after `process.nextTick`, `queueMicrotask`, and zero-delay `setTimeout` callbacks before process exit. It returns a numeric handle accepted by `clearImmediate(handle)` before the drain; omitted or undefined-valued clear handles are no-op clears that still evaluate ignored arguments.
- `process.getuid(...ignored)`, `process.getgid(...ignored)`, `process.geteuid(...ignored)`, `process.getegid(...ignored)`, and `process.getgroups(...ignored)` expose POSIX process identity values.
- `process.umask(mask?, ...ignored)` reads or updates the native process file mode creation mask.
- `process.memoryUsage(...ignored)` returns a Node-shaped dynamic object with numeric `rss`, `heapTotal`, `heapUsed`, `external`, and `arrayBuffers` fields. RSS is populated from `getrusage` where available; heap fields are placeholders until a tracked allocator lands.
- `process.cpuUsage()` returns a Node-shaped dynamic object with numeric `user` and `system` microsecond counters populated from `getrusage`.
- `process.resourceUsage(...ignored)` returns a Node-shaped dynamic object with numeric `getrusage` counters for CPU time, RSS, page faults, filesystem I/O, IPC, signals, and context switches.
- `process.kill(pid, signal?)` supports a narrow POSIX signal subset: omitted signal / `SIGTERM` / `15`, `SIGKILL` / `9`, and numeric signal `0` existence probes.
- `process.exit(code)` → `tsc_process_exit`
- Tests: `wordcount`, `stdlib_os`, `process_argv_meta`, `process_chdir`, `process_cpu_usage`, `process_env_mutation`, `process_features`, `process_metadata`, `process_ppid`, `process_getgroups`, `process_hrtime`, `process_hrtime_bigint`, `process_kill_signal_zero`, `process_memory_usage`, `process_next_tick`, `process_next_tick_args`, `set_immediate`, `timers_clear`, `process_posix_ids`, `process_release`, `process_resource_usage`, `process_stdio_write`, `process_stdio_write_buffer`, `process_title`, `process_umask`, `process_versions`

### `console`
- `console.log` / `.error` / `.warn` / `.info` — variadic, auto-stringifies each arg
- First-argument formatting for `%s`, `%d`, `%i`, `%f`, `%o`, `%O`, `%c`, and `%%`. Test: `console_format`
- Runtime: `tsc_console_log_n`, `tsc_console_error_n`

### `Date`, `Number`, `Array`, `Object`
- `Date.now()` -> `tsc_date_now` (ms since epoch), callable `Date(...)` evaluates and ignores arguments before returning the current local Date string, `Date.UTC(year?, month?, ...)` supports JavaScript optional-argument defaults, ignores evaluated arguments beyond the seventh date component, and returns normalized UTC epoch milliseconds, `Date.parse(text?, ...ignored)` accepts a bounded deterministic ISO subset, returns `NaN` with no argument, and evaluates then ignores extra arguments, and `new Date()` / `new Date(ms)` / `new Date(text)` / `new Date(existingDate)` / `new Date(year, month, ...)` produce a narrow Date instance subset with evaluated extra numeric-constructor arguments ignored beyond the seventh date component, `.getTime()`, UTC component getters, local-time component getters, `.getYear()`, `.getTimezoneOffset()`, `.setTime(ms)`, legacy `.setYear(year)`, local-time mutators (`setFullYear`, `setMonth`, `setDate`, `setHours`, `setMinutes`, `setSeconds`, `setMilliseconds`) with invalid-receiver epoch rebuild for `setFullYear`, UTC mutators (`setUTCFullYear`, `setUTCMonth`, `setUTCDate`, `setUTCHours`, `setUTCMinutes`, `setUTCSeconds`, `setUTCMilliseconds`) with invalid-receiver epoch rebuild for `setUTCFullYear`, mutator methods evaluating then ignoring extra arguments beyond the fields JavaScript consumes, `.valueOf()`, local `.toString()` / `String(date)`, bounded en-US `.toLocaleString()`, `.toLocaleDateString()`, `.toLocaleTimeString()` with evaluated ignored locale/options arguments, `.toDateString()`, `.toTimeString()`, `.toISOString()` with invalid receivers throwing `RangeError: Invalid time value`, `.toUTCString()` / `.toGMTString()`, and `.toJSON(key?)` / extra arguments to zero-argument Date methods evaluating before being ignored where JavaScript ignores them; the ambient Date shim accepts those ignored arguments without `@ts-ignore`. Valid dates return UTC ISO strings from `toJSON(...)`; invalid dates return `null`. Tests: `date_now`, `date_callable`, `date_instances`, `date_locale_parts`, `date_local_constructor`, `date_legacy_year`, `date_local_setters`, `date_utc`, `date_parse`, `date_set_time`, `date_utc_getters`, `date_local_getters`, `date_utc_setters`, `date_to_date_string`, `date_to_time_string`, `date_to_iso_string`, `date_to_utc_string`, `date_to_json`, `date_to_json_invalid`, `date_ignored_arguments`
- `Math.*` covers the common libm/int32/fround surface: `floor`, `ceil`, `round` with negative-zero preservation, `abs`, `trunc`, `sign` with signed-zero preservation, `imul`, `clz32`, `fround`, `cbrt`, `sqrt`, `pow`, variadic `hypot(...)`, `min`/`max` with JS `NaN` propagation, `log`, `log1p`, `log2`, `log10`, `exp`, `expm1`, trigonometric/inverse-trigonometric and hyperbolic/inverse-hyperbolic functions, `atan2`, `random`, and constants. Fixed-input Math methods evaluate and ignore extra arguments after the JavaScript-consumed numeric inputs. Tests: `math`, `math_more`, `math_constants_more`, `math_int32_float`
- `Number.EPSILON`, `MAX_SAFE_INTEGER`, `MAX_VALUE`, `MIN_SAFE_INTEGER`, `MIN_VALUE`, `NaN`, `NEGATIVE_INFINITY`, `POSITIVE_INFINITY`, plus `Number.isInteger(value, ...ignored)`, `Number.isFinite(value, ...ignored)`, `Number.isNaN(value, ...ignored)`, `Number.isSafeInteger(value, ...ignored)`, `Number.parseFloat(value, ...ignored)`, `Number.parseInt(value, radix?, ...ignored)` with JS-style omitted/zero radix inference, invalid-radix `NaN`, and evaluated ignored extra arguments. Tests: `stdlib_os`, `number_static_more`, `number_constants`
- `Array.isArray(x)`, `Array.from(arr)`, `Array.of(...items)`
- `Object.keys(obj)`, `Object.values(obj)`, and `Object.hasOwn(obj, key)` — compile-time expanded from the type's property list, with `Object.keys` preserving receiver evaluation
- `Object.keys(array)`, `Object.values(array)`, `Object.entries(array)`, `Object.getOwnPropertyNames(array)`, and `Reflect.ownKeys(array)` enumerate typed array indexes/values plus non-enumerable `length` where appropriate. Test: `object_array_enumeration`
- `Object.getOwnPropertyNames(obj)` — compile-time expanded from typed interface/class field lists while preserving receiver evaluation. Test: `typed_object_property_names`
- `Object.getOwnPropertyDescriptor(obj, key)`, `Object.getOwnPropertyDescriptors(obj)`, and `Reflect.getOwnPropertyDescriptor(obj, key)` return typed interface/class field data descriptors; `Reflect.get(obj, key)` reads typed interface/class fields as dynamic values, `Reflect.get(obj, key, receiver)` accepts and evaluates the optional receiver for typed arrays, typed interface/class objects, and Buffer data-property reads, `Reflect.set(obj, key, value)` writes typed fields, `Reflect.has(obj, key)` checks typed field lists, and `Reflect.ownKeys(obj)` is compile-time expanded from typed field lists while preserving receiver evaluation. Tests: `typed_property_descriptor`, `typed_property_descriptors`, `typed_reflect_get`, `reflect_get_receiver_typed`, `typed_reflect_set`, `typed_reflect_has`, `typed_reflect_own_keys`, `typed_object_property_names`
- `obj.hasOwnProperty(key, ...ignored)` and `obj.propertyIsEnumerable(key, ...ignored)` work for typed interface/class fields. Test: `typed_object_has_own`
- `obj.toString()`, `obj.toLocaleString()`, and `obj.valueOf()` fall back to Object-prototype behavior for typed interface/class values unless a class defines its own method. Test: `typed_object_methods`
- `Object.entries(obj)`, `Object.fromEntries(entries)`, and `Object.fromEntries(map)` — typed `[string, T]` entry arrays or typed `Map<string, T>` sources for homogeneous object fields. Tests: `object_entries`, `object_from_entries_map`
- `Map`, `Set`, `WeakMap`, `WeakSet`, `WeakRef`, and `FinalizationRegistry` instances expose empty own-property results through `Object.keys`, `Object.values`, `Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, inherited `hasOwnProperty(prop, ...ignored)` / `propertyIsEnumerable(prop, ...ignored)`, `Reflect.ownKeys`, and `Reflect.getOwnPropertyDescriptor`, while preserving receiver/key evaluation. Test: `collection_object_methods`
- Global `parseInt` / `parseFloat` / `isNaN` / `isFinite` → mapped to runtime or C math builtins, with global `parseInt` sharing the JS-style radix inference path, `parseInt`/`parseFloat` evaluating ignored extra arguments, and global numeric predicates coercing non-number inputs while evaluating ignored extra arguments.
- Global `btoa(value)` and `atob(value)` perform byte-string base64 encode/decode through the same runtime codec used by Buffer. Test: `base64_globals`

---

## 11. Diagnostics & tooling

- TypeScript type-checking via the official compiler API — any TS type error is surfaced with full source context (file:line:col + code frame) before emission. Test: try `/tmp/bad.ts` with `const x: number = "str"`.
- Unsupported-feature diagnostics include source location and a one-line reason — exit code 3 distinguishes them from TS errors (exit 2) and gcc failures (exit 1).
- AOT closure diagnostics reject unknown-source `eval`, `Function` / `new Function`, non-finite `require(variable)` without a static proof or manifest, unallow-listed literal native addon specifiers ending in `.node`, and unallow-listed literal package imports/requires whose installed package root contains `build/Release/*.node`, package `exports` / `imports` references to `.node`, or package-private `#...` imports that resolve to `.node`, including transitive imports from emitted package sources under `node_modules`. Constant runtime-code strings compile AOT for expression `eval("...")` and constant-body `Function("return ...")` / `new Function("return ...")` without enabling unsafe eval. `--runtime-code-manifest <path>` is an explicit compile-time allow-list for non-constant runtime-code source strings; manifest entries use JSON shape `{ "eval": ["1 + 2"], "functions": ["return 42;"] }`, dispatch over the finite string set at runtime, and lower matching entries to generated AOT constants rather than dynamically loading code. Top-level finite const string `require(name)` specifiers, including string concatenation, template expressions whose parts are all statically known, conditional alternatives, identifiers annotated as string-literal unions, and top-level const string maps/arrays used through element/property access are resolved into the AOT module graph. Side-effect-only `require(name)` statements include every possible specifier as an eager AOT module edge; value-returning finite-set `require(name)` calls dispatch over the same finite alternatives for AOT-known `module.exports = ...` values and materialize AOT-known `module.exports.name = ...` named exports plus object-literal named exports with package-local `require(...)` spreads into dynamic objects. `--dynamic-require-manifest <path>` is an explicit compile-time allow-list for non-finite dynamic require sites; manifest entries use JSON shape `{ "requires": ["./specifier"] }`, enter the AOT module graph, and share the same runtime finite dispatch. `--unsafe-eval` is an explicit compile-time gate for runtime code compilation that remains available for unknown runtime source strings: it emits embedded Node bridge calls for `eval` and callable `Function` values, copies `runtime/tsc_node_embed.cc`, and requires discoverable `libnode` inputs when linking. `--native-addon-manifest <path>` is a separate compile-time allow-list for known native addons; manifest entries map literal specifiers to concrete `.node` files, lower to `tsc_node_native_addon(...)`, copy `runtime/tsc_node_embed.cc`, and require discoverable `libnode` inputs when linking without enabling unsafe eval. Direct `.node` default imports are declared as `any` for manifest-backed native bridge imports. Tests/checks: `runtime_eval`, `runtime_eval_manifest`, `runtime_eval_unknown`, `runtime_function_call`, `runtime_function_call_unknown`, `runtime_function_constructor`, `runtime_function_constructor_unknown`, `runtime_function_manifest`, `dynamic_require`, `dynamic_require_commonjs_shapes`, `dynamic_require_literal_union`, `dynamic_require_manifest`, `dynamic_require_static_collections`, `dynamic_require_unknown`, `native_addon`, `native_addon_manifest_import`, `native_addon_manifest_require`, `native_addon_package`, `native_addon_package_imports`, `node_modules_transitive_native_addon`, focused `--unsafe-eval --emit-c-only` bridge checks
- Generated C includes `#line` directives for emitted TypeScript statements so debugger and compiler locations can point back to TS source. Test: `line_directives`
- `--emit-c-only` — skip gcc, just write the generated `main.c` for inspection.
- `--keep-build-dir <path>` — keep intermediate files rather than using a tempdir.
- `--verbose` — print compile steps + the full gcc command line.
- `--no-gc` — link without Boehm GC (leaking `calloc` fallback) for environments where `libgc-dev` isn't installed.
- `--release` — link a smaller release binary using gcc `-Os -s` instead of the default `-O2`. Test: `release_build`
- `--unsafe-eval` — opt into runtime code compilation through the embedded Node bridge. Linking requires `libnode`; set `TSC2C_LIBNODE` and optionally `TSC2C_NODE_INCLUDE` when Node headers/libs are not in the active Node prefix.
- `--native-addon-manifest <path>` — opt specific native addon specifiers into the embedded Node bridge without enabling unsafe eval. The JSON shape is `{ "addons": { "specifier": "relative/or/absolute/addon.node" } }`; paths are resolved relative to the manifest and must point to existing `.node` files.
- `--dynamic-require-manifest <path>` — opt non-finite dynamic require sites into finite AOT dispatch. The JSON shape is `{ "requires": ["./specifier"] }`; each listed specifier is resolved from the dynamic call's containing file and compiled into the module graph.
- `--runtime-code-manifest <path>` — opt non-constant `eval(...)` / `Function(...)` source strings into finite AOT dispatch without enabling unsafe eval. The JSON shape is `{ "eval": ["1 + 2"], "functions": ["return 42;"] }`; each listed source string must parse as a supported AOT constant expression or constant-return function body.
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
| `async_await_immediate` | immediate await over fulfilled/rejected/pending native Promise records |
| `async_await_try_catch` | local async try/catch handles rejected immediate await records |
| `async_await_values_immediate` | immediate await of non-Promise values inside async functions |
| `async_function_immediate` | async function declarations without await returning immediate Promise records |
| `async_function_values_immediate` | async function values without await returning immediate Promise records |
| `async_methods_immediate` | async class methods without await returning immediate Promise records |
| `async_throw_rejection` | synchronous throws in immediate async functions become rejected Promise records |
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
| `aggregate_error_constructor` | AggregateError constructor/callable form with stored errors, ignored extra args, and Error stringification |
| `base64_globals` | global btoa/atob byte-string base64 helpers |
| `bigint` | GMP-backed BigInt literals, arithmetic, comparison, and toString |
| `bitwise_assign` | typed numeric bitwise compound assignments |
| `classes` | class + ctor/method + `this` + `new`, including spread constructor calls |
| `buffer` | binary-safe Buffer construction, indexing, slicing, hex/utf8 conversion |
| `buffer_concat_length` | Buffer.concat explicit totalLength truncation and zero padding |
| `buffer_copy` | Buffer.copy clipped byte-range copying into target buffers |
| `buffer_fill` | Buffer.fill numeric byte mutation with clipped indexes |
| `buffer_float_io` | Buffer float/double little/big-endian read/write methods |
| `buffer_from_buffer` | Buffer.from(Buffer) independent byte copy |
| `buffer_alloc_unsafe` | Buffer.allocUnsafe/allocUnsafeSlow backed by deterministic Buffer allocation |
| `buffer_base64` | Buffer base64 from/toString/byteLength/isEncoding support |
| `buffer_int_io` | Buffer signed 8/16/32-bit little/big-endian read/write methods |
| `buffer_object_methods` | Buffer toLocaleString/valueOf object methods |
| `buffer_search` | Buffer numeric-byte indexOf/lastIndexOf/includes with offsets |
| `buffer_search_more` | Buffer string and Buffer needle indexOf/lastIndexOf/includes |
| `buffer_static_more` | Buffer.byteLength/isEncoding/compare static helpers |
| `buffer_swap` | Buffer swap16/swap32/swap64 byte-order mutation |
| `buffer_to_json` | Buffer.toJSON dynamic object shape |
| `buffer_uint8_io` | Buffer readUInt8/writeUInt8 byte accessors |
| `buffer_uint_multi_io` | Buffer unsigned 16/32-bit little/big-endian read/write methods |
| `buffer_write` | Buffer.write UTF-8/hex string bytes with offset/length clipping |
| `class_computed_members` | literal and const-literal computed class fields/methods |
| `class_modifiers` | abstract/access/readonly modifiers accepted as TS-only |
| `class_static_blocks` | class static initialization blocks execute in member order with static fields |
| `closure_optional_parameters` | first-class closures accept omitted optional pointer and function parameters |
| `collection_object_methods` | Map/Set/WeakMap/WeakSet/WeakRef toString/toLocaleString/valueOf |
| `comma_operator` | comma operator side effects and right-hand value |
| `child_process_exec_callbacks` | child_process exec/execFile immediate UTF-8 callback subset |
| `child_process_exec_callbacks_cwd` | child_process exec/execFile immediate callback cwd option |
| `child_process_exec_callback_error` | child_process.exec callback child setup error |
| `child_process_exec_callback_encoding` | child_process exec/execFile callback UTF-8 encoding option |
| `child_process_exec_callback_timeout` | child_process exec/execFile callback timeout option |
| `child_process_numeric_kill_signal` | child_process timeout numeric killSignal options |
| `child_process_exec_shell_string` | child_process.exec/execSync shell path string option |
| `child_process_env_options` | child_process literal env overlays for sync and immediate callback subsets |
| `child_process_argv0_options` | child_process spawnSync/execFile argv0 options |
| `child_process_max_buffer_options` | child_process maxBuffer option for callback, sync, and spawnSync subsets |
| `child_process_exec_file_callback_no_args` | child_process.execFile file/callback argument form |
| `child_process_exec_file_callback_error` | child_process.execFile callback child setup error |
| `child_process_exec_file_sync` | child_process.execFileSync stdout Buffer subset |
| `child_process_exec_file_sync_cwd` | child_process.execFileSync cwd option |
| `child_process_exec_file_sync_input` | child_process.execFileSync input option |
| `child_process_exec_file_sync_options_second_arg` | child_process.execFileSync file/options argument form |
| `child_process_exec_file_sync_stderr_pipe` | child_process.execFileSync drains child stderr |
| `child_process_exec_file_shell` | child_process execFile/execFileSync shell option |
| `child_process_exec_sync` | child_process.execSync stdout Buffer subset |
| `child_process_exec_sync_encoding` | child_process.execSync and execFileSync UTF-8 string return options |
| `child_process_exec_sync_buffer_encoding` | child_process.execSync and execFileSync explicit buffer encoding options |
| `child_process_exec_sync_options` | child_process.execSync cwd/input options |
| `child_process_exec_sync_timeout_options` | child_process.execSync and execFileSync timeout/killSignal options |
| `child_process_options_second_arg` | child_process execFile/spawnSync file/options argument forms |
| `child_process_spawn_sync` | child_process.spawnSync utf8 status/stdout/stderr subset |
| `child_process_spawn_sync_cwd` | child_process.spawnSync cwd option in the UTF-8 subset |
| `child_process_spawn_sync_detached` | child_process.spawnSync detached POSIX session option |
| `child_process_spawn_sync_detached_false` | child_process.spawnSync explicit attached detached:false path |
| `child_process_spawn_sync_exec_error` | child_process.spawnSync exec failure error metadata |
| `child_process_spawn_sync_input` | child_process.spawnSync input option in the UTF-8 subset |
| `child_process_spawn_sync_nonzero_status` | child_process.spawnSync nonzero exit status result |
| `child_process_spawn_sync_result_metadata` | child_process.spawnSync result pid/output/signal/error metadata |
| `child_process_spawn_sync_signal` | child_process.spawnSync signal-terminated result metadata |
| `child_process_spawn_sync_shell` | child_process.spawnSync shell option in the UTF-8 subset |
| `child_process_spawn_sync_stdio_pipe` | child_process.spawnSync explicit stdio pipe option forms |
| `child_process_spawn_sync_stdio_ignore` | child_process.spawnSync explicit stdio ignore option forms |
| `child_process_spawn_sync_stdio_inherit` | child_process.spawnSync explicit stdio inherit option forms |
| `child_process_spawn_sync_stdio_stdin` | child_process.spawnSync stdio tuple stdin pipe/ignore handling |
| `child_process_spawn_sync_stdio_default_entries` | child_process.spawnSync stdio tuple null/undefined default entries |
| `child_process_spawn_sync_stdio_fd` | child_process.spawnSync stdio tuple numeric fd inherit entries |
| `child_process_spawn_sync_timeout` | child_process.spawnSync timeout result metadata |
| `child_process_spawn_sync_kill_signal` | child_process.spawnSync timeout killSignal option |
| `child_process_uid_gid_options` | child_process applies POSIX uid/gid options |
| `child_process_windows_hide_option` | child_process accepts inert windowsHide option |
| `child_process_windows_verbatim_option` | child_process accepts inert windowsVerbatimArguments option |
| `child_process_shell_string` | child_process shell path string option |
| `child_process_shell_false` | child_process explicit shell:false direct exec option |
| `computed_props` | computed object-literal keys resolved at compile time |
| `console_format` | first-argument console `%` specifier formatting |
| `crypto_sha256` | sha256 update + hex digest |
| `crypto_hash_more` | sha1/sha512 digests and Buffer-backed hash updates |
| `crypto_import` | crypto/node:crypto createHash named and namespace imports |
| `crypto_digest_base64` | crypto Hash.digest base64 output |
| `crypto_random_bytes` | crypto.randomBytes Buffer creation |
| `crypto_random_uuid` | crypto.randomUUID version 4 UUID strings |
| `custom_iterator_entry_destructure` | custom iterator yielding ObjectEntry values with `[key, value]` destructuring |
| `custom_iterator_object` | class `[Symbol.iterator]()` returning an iterator object with `next()` |
| `custom_iterator_inherited_next` | custom iterator object whose `next()` method is inherited from a base class |
| `custom_iterator_self` | direct self-iterable custom iterator object with `next()` |
| `custom_predicates` | user-defined type predicate narrowing over interface-shaped union values |
| `dns_lookup` | immediate dns.lookup callback support through global, named, and namespace imports |
| `dns_lookup_all` | dns.lookup and dns.promises.lookup all:true result arrays |
| `dns_lookup_hints` | dns.lookup and dns.promises.lookup hints constants |
| `dns_lookup_option_forms` | dns.lookup numeric family shorthand plus literal verbatim/order options |
| `dns_lookup_options` | immediate dns.lookup family option support |
| `dns_promises_lookup` | immediate dns.promises.lookup fulfilled result objects |
| `enums` | numeric enum constants |
| `error_constructors` | TypeError, RangeError, and SyntaxError constructors share Error object behavior and ignored extra args |
| `error_cause` | Error-family and AggregateError literal cause options exposed through .cause |
| `error_instances` | Error object subset with name/message/stringification/valueOf, ignored extra args, and throw stringification |
| `error_more_constructors` | ReferenceError, EvalError, and URIError constructors share Error object behavior |
| `event_emitter` | synchronous EventEmitter listener registration, emit, once, removal, and listener counts |
| `event_emitter_default_max_listeners` | EventEmitter.defaultMaxListeners and events.defaultMaxListeners configure default max listeners |
| `event_emitter_error_event` | unhandled EventEmitter `"error"` emits throw while handled errors emit normally |
| `event_emitter_import` | named `EventEmitter` import from `node:events` backed by the same synchronous runtime |
| `event_emitter_listener_count_filter` | EventEmitter listenerCount optional listener identity filtering |
| `event_emitter_listeners` | EventEmitter listeners() and events.getEventListeners expose stable listener identities |
| `event_emitter_max_listeners` | EventEmitter get/set max listener count through instance and events module helpers |
| `event_emitter_more` | EventEmitter prepend listeners, event-name enumeration, and module-level `events.listenerCount` |
| `event_emitter_namespace` | namespace `node:events` import with `events.EventEmitter` and `events.listenerCount` |
| `event_emitter_once_promise` | module-level events.once Promise fulfillment and error rejection |
| `event_emitter_once_reentrant` | EventEmitter once listeners are removed before invocation for reentrant emit |
| `event_emitter_raw_listeners` | EventEmitter rawListeners returns stable once wrappers with listener back-pointers |
| `event_emitter_remove_latest` | EventEmitter off/removeListener removes the most recently added matching listener |
| `event_emitter_static_listener_count` | static EventEmitter.listenerCount helper with optional listener identity filtering |
| `event_target` | synchronous EventTarget listener registration, duplicate suppression, removal, dispatch, and cancelable Event objects |
| `event_target_options` | EventTarget add/remove listener options with once, capture, and passive literals |
| `exponent_assign` | exponentiation compound assignment for number, BigInt, and dynamic values |
| `fs_access_sync` | fs.accessSync global, namespace, and named import support |
| `fs_access_modes` | fs.constants and POSIX access mode checks for fs.accessSync/fs.promises.access |
| `fs_append` | fs appendFileSync and immediate-settled fs.promises appendFile |
| `fs_buffer_path_like` | fs Buffer path arguments for sync, named import, and immediate promise calls |
| `fs_file_url_path_like` | fs file URL path arguments for sync, named import, and immediate promise calls |
| `fs_chmod` | fs.chmodSync and immediate-settled fs.promises chmod with Stats.mode |
| `fs_copy_flags` | fs copy constants and COPYFILE_EXCL behavior |
| `fs_readdir_dirents` | fs readdir with withFileTypes Dirent subset for sync, named import, and promises |
| `fs_readdir_options` | fs readdir UTF-8 encoding options for sync and immediate promise forms |
| `fs_readdir_buffer_options` | fs readdir explicit Buffer encoding options for sync and immediate promise runtime paths |
| `fs_read_file_buffer_options` | fs.readFileSync and immediate fs.promises.readFile explicit buffer encoding options return Buffer bytes |
| `fs_read_file_null_buffer_options` | fs.readFileSync and immediate fs.promises.readFile null encoding options return Buffer bytes |
| `fs_readdir_recursive` | fs readdir recursive string results for sync, named import, and promises |
| `inheritance` | extends + super() + static members |
| `instanceof` | class instance ancestry checks |
| `interface_inheritance` | interface extends fields and typed object key order |
| `interfaces` | interface + object literal + nested refs + shorthand |
| `exceptions` | throw + try/catch/finally + re-throw + nested |
| `module_default_anonymous_function` | default import of anonymous default-exported function |
| `module_default_class_import` | default import of named default-exported class |
| `module_default_export_assignment` | default import of identifier export assignment |
| `module_default_re_export` | default re-export through a barrel module |
| `module_export_star` | export-star barrel re-exports |
| `module_import_aliases` | default imports and renamed named imports |
| `module_namespace_import` | local module namespace import values and functions |
| `module_re_exports` | simple barrel re-exports |
| `module_side_effect_import` | side-effect-only imports execute dependency module initializers |
| `module_type_only_import` | type-only imports do not run imported module initializers |
| `module_type_only_re_export` | type-only re-exports do not run imported module initializers |
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
| `default_parameter_function_initializers` | default parameters can initialize omitted function-typed arguments with arrow/function closure values |
| `optional_parameters` | omitted optional pointer and function parameters lower to undefined/null sentinels |
| `os_more` | os.type/release/endianness/EOL through global, namespace, and named imports |
| `os_host_more` | os.availableParallelism/machine/version through global, namespace, and named imports |
| `os_dev_null` | os.devNull constant for global, namespace, and named import forms |
| `os_system_stats` | os.totalmem/freemem/uptime/loadavg through global, namespace, and named imports |
| `os_user_info` | os.userInfo dynamic object through global, namespace, and named imports |
| `path_constants` | path sep and delimiter constants for global, named import, and namespace import forms |
| `path_basename_suffix` | path.basename optional suffix for global, namespace, named, and posix forms |
| `path_import` | path named and namespace imports from node:path/path |
| `path_normalize` | bounded POSIX path.normalize segment cleanup and path.isAbsolute checks |
| `path_parse_format` | bounded POSIX path.parse/path.format dynamic path objects |
| `path_posix` | path.posix and named posix imports route to the supported POSIX path subset |
| `path_relative` | bounded POSIX path.relative and named node:path import |
| `path_to_namespaced` | path.toNamespacedPath POSIX no-op for global, namespace, named, and posix forms |
| `process_argv_meta` | process argv0/execPath/execArgv metadata |
| `process_chdir` | process.chdir updates cwd |
| `process_cpu_usage` | process.cpuUsage numeric user/system fields |
| `process_env_mutation` | process.env property/element reads, writes, and deletes |
| `process_features` | process.features bounded boolean metadata object |
| `process_getgroups` | process.getgroups POSIX supplementary group metadata |
| `process_hrtime` | process.hrtime monotonic timestamp and diff pairs |
| `process_hrtime_bigint` | process.hrtime.bigint monotonic nanosecond BigInt timestamp |
| `process_kill_signal_zero` | process.kill signal 0 existence probe |
| `process_memory_usage` | process.memoryUsage numeric memory fields |
| `process_metadata` | process.platform/arch/pid/uptime metadata |
| `process_next_tick` | bounded zero-argument process.nextTick queue drained before exit |
| `process_next_tick_args` | bounded process.nextTick callback arguments are queued and delivered in order |
| `process_ppid` | process.ppid parent process metadata |
| `process_posix_ids` | process POSIX uid/gid/euid/egid helpers |
| `process_release` | process.release Node-shaped metadata object |
| `process_resource_usage` | process.resourceUsage numeric getrusage fields |
| `process_stdio_write` | process.stdout.write and process.stderr.write string subset |
| `process_stdio_write_buffer` | process.stdout.write and process.stderr.write Buffer subset |
| `process_title` | process.title readonly argv0-backed metadata |
| `process_umask` | process.umask read/update/restore behavior |
| `process_versions` | process.version and process.versions metadata |
| `promise_callback_adopt` | Promise callbacks and Promise.try adopt returned native Promise records |
| `promise_callback_throw` | Promise callbacks that throw become rejected Promise records in the immediate subset |
| `promise_empty_handlers` | Promise.catch and finally omitted or undefined handlers pass settled and pending state through |
| `promise_executor` | immediate new Promise executor settlement and pending fallback |
| `promise_finally_adopt` | Promise.finally adopts returned native Promise records in the immediate subset |
| `queue_microtask` | bounded queueMicrotask callbacks drain after process.nextTick before exit |
| `set_timeout_zero` | bounded zero-delay setTimeout callbacks drain before setImmediate |
| `set_immediate` | bounded setImmediate callbacks drain after nextTick, queueMicrotask, and zero-delay setTimeout before exit |
| `timers_clear` | bounded setTimeout/setImmediate handles can be cleared before the before-exit drain, including clearInterval timeout-handle aliases |
| `promise_resolve_adopt` | Promise.resolve adopts existing native Promise records |
| `promise_settled` | settled Promise.resolve/reject with synchronous then/catch/finally chaining and combinators |
| `promise_then_passthrough` | Promise.then omitted or undefined fulfillment callbacks pass through settled values |
| `promise_try` | Promise.try immediate callback fulfillment and throw-to-rejection conversion |
| `fs_buffer_write_append` | fs writeFile/appendFile Buffer data for sync and promises |
| `fs_chown` | fs.chownSync and immediate fs.promises.chown numeric uid/gid |
| `fs_lchown` | fs.lchownSync and immediate fs.promises.lchown numeric uid/gid for symlinks |
| `fs_copy_rename` | fs copyFileSync/renameSync and immediate-settled fs.promises copyFile/rename |
| `fs_cp_recursive` | fs.cpSync and immediate-settled fs.promises.cp recursive regular file and directory copy |
| `fs_cp_options` | fs.cpSync and immediate-settled fs.promises.cp force/errorOnExist/mode/preserveTimestamps behavior |
| `fs_cp_symlink_options` | fs.cpSync and immediate-settled fs.promises.cp symlink dereference/verbatim options |
| `fs_write_file_flags` | fs.writeFileSync and fs.promises.writeFile append/exclusive/update literal flag options |
| `fs_file_flag_options` | fs readFile and appendFile literal flag options for sync, named import, and promises |
| `fs_read_file_plus_flags` | fs readFile literal `"r+"` and `"rs+"` flag options for sync, named import, and promises |
| `fs_write_append_mode_options` | fs writeFile/appendFile numeric mode options for sync, named import, and promises |
| `fs_encoding_options` | fs UTF-8 encoding string/object options for read/write/append sync and immediate-settled promise calls |
| `fs_lstat` | fs.lstatSync and immediate-settled fs.promises lstat with symbolic-link Stats |
| `fs_link` | fs.linkSync and immediate-settled fs.promises link |
| `fs_link_path_encoding_options` | fs realpath/readlink UTF-8 and explicit Buffer encoding options for sync and promises |
| `fs_mkdtemp` | fs.mkdtempSync and immediate-settled fs.promises mkdtemp |
| `fs_mkdtemp_encoding_options` | fs mkdtemp UTF-8 and explicit Buffer encoding options for sync and promises |
| `fs_promises` | immediate-settled fs.promises readFile/writeFile/readdir/access over the sync fs runtime |
| `fs_promises_import` | fs.promises named and namespace imports from node:fs/fs |
| `fs_promises_mutation` | immediate-settled fs.promises mkdir/unlink/rm/rmdir over the sync fs runtime |
| `fs_promises_rejections` | sync filesystem throws inside immediate fs.promises wrappers become rejected Promise records |
| `fs_realpath` | fs.realpathSync and immediate-settled fs.promises realpath |
| `fs_readlink` | fs.readlinkSync and immediate-settled fs.promises readlink |
| `fs_recursive_options` | fs mkdir recursive plus rm/rmdir recursive and retry option-object shapes for sync and immediate-settled promise calls |
| `fs_roundtrip` | fs.readFileSync + writeFileSync + path helpers |
| `fs_stat` | fs.statSync, node:fs statSync, fs.promises.stat, and Promise.resolve over the typed Stats subset |
| `fs_stat_options` | fs stat/lstat bigint:false plus throwIfNoEntry:true options for sync and promises |
| `fs_stats_kinds` | fs.Stats extra POSIX kind predicates |
| `fs_stats_metadata` | fs.Stats numeric metadata fields |
| `fs_stats_times` | fs.Stats numeric and Date timestamp fields |
| `fs_symlink` | fs.symlinkSync and immediate-settled fs.promises symlink |
| `fs_symlink_type_options` | fs symlink literal type options for sync and promises |
| `fs_sync_mutation` | fs mkdirSync/unlinkSync/rmSync/rmdirSync through node:fs namespace imports |
| `fs_truncate` | fs.truncateSync and immediate-settled fs.promises truncate |
| `fs_utimes` | fs.utimesSync and immediate-settled fs.promises.utimes |
| `fs_lutimes` | fs.lutimesSync and immediate-settled fs.promises.lutimes on symlinks |
| `fs_mkdir_mode_options` | fs.mkdirSync and immediate-settled fs.promises.mkdir numeric mode options |
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
| `native_addon_manifest_import` | manifest-listed direct `.node` import emits the embedded Node native-addon bridge |
| `native_addon_manifest_require` | compile-time native-addon manifest lowers an allow-listed require to the embedded Node bridge |
| `native_addon_package` | expected diagnostic for imported packages containing native addon binaries |
| `native_addon_package_imports` | expected diagnostic for package imports resolving to native addon binaries |
| `net_is_ip` | net isIP/isIPv4/isIPv6 address classification |
| `node_modules_commonjs_bracket_exports` | narrow CommonJS package string-literal bracket export assignments |
| `node_modules_commonjs_assignment_esmodule_marker` | narrow CommonJS package assignment-style `exports.__esModule = true` marker elision |
| `node_modules_commonjs_exports_alias` | narrow CommonJS package static top-level `exports` / `module.exports` wrapper aliases |
| `node_modules_commonjs_computed_exports` | narrow CommonJS package statically computed bracket export assignments |
| `node_modules_commonjs_computed_string_exports` | narrow CommonJS package string-concatenated/template-literal computed bracket export assignments |
| `node_modules_commonjs_object_assign_require_exports` | narrow CommonJS package `Object.assign(exports, require("./local.js"))` re-export mutation |
| `node_modules_commonjs_object_assign_exports` | narrow CommonJS package `Object.assign(exports/module.exports, object)` data/default export mutation |
| `node_modules_commonjs_object_assign_from_entries_exports` | narrow CommonJS package `Object.assign(exports, Object.fromEntries(...))` static default/named metadata from inline entries and wrapped declared `Object.entries(api)` sources |
| `node_modules_commonjs_object_assign_identifier_exports` | narrow CommonJS package `Object.assign(exports, declaredObject)` data/default export mutation |
| `node_modules_commonjs_object_assign_spread_exports` | narrow CommonJS package `Object.assign(exports, { ...declaredObject, extra })` static spread export metadata |
| `node_modules_commonjs_object_literal_computed_exports` | narrow CommonJS package statically computed object-literal keys in `Object.assign(exports/module.exports, object)` and `module.exports = object` export metadata |
| `node_modules_commonjs_object_assign_getter_exports` | narrow CommonJS package `Object.assign(exports, { get name() { ... } })` getter export mutation |
| `node_modules_commonjs_object_assign_require_member_exports` | narrow CommonJS package `Object.assign(exports, { name: require("./local.js").member })` member re-export mutation |
| `node_modules_commonjs_object_assign_require_binding_exports` | narrow CommonJS package `Object.assign(exports, declaredObject)` values backed by declared `require("./local.js")` bindings |
| `node_modules_commonjs_define_properties_exports` | narrow CommonJS package `Object.defineProperties(exports, descriptors)` descriptor-map exports |
| `node_modules_commonjs_define_properties_identifier_exports` | narrow CommonJS package `Object.defineProperties(exports, declaredDescriptors)` descriptor-map exports |
| `node_modules_commonjs_define_properties_own_descriptors_exports` | narrow CommonJS package `Object.defineProperties(exports, Object.getOwnPropertyDescriptors(staticObject))` descriptor-preserving exports |
| `node_modules_commonjs_define_properties_own_descriptors_accessor_exports` | narrow CommonJS package `Object.defineProperties(exports, Object.getOwnPropertyDescriptors(staticObject))` getter and method descriptor-preserving exports |
| `node_modules_commonjs_define_properties_descriptor_identifier_exports` | narrow CommonJS package `Object.defineProperties(exports, { name: descriptor })` descriptor-variable exports |
| `node_modules_commonjs_define_property_default_export` | narrow CommonJS package `Object.defineProperty(exports, "default", { value })` default-export interop |
| `node_modules_commonjs_define_property_computed_exports` | narrow CommonJS package statically computed `Object.defineProperty` and `Object.defineProperties` export keys |
| `node_modules_commonjs_define_property_exports` | narrow CommonJS package `Object.defineProperty(exports, name, { value })` data exports |
| `node_modules_commonjs_define_property_identifier_exports` | narrow CommonJS package `Object.defineProperty(exports, name, descriptor)` data exports |
| `node_modules_commonjs_define_property_require_member_exports` | narrow CommonJS package descriptor values backed by `require("./local.js").member` |
| `node_modules_commonjs_define_property_require_binding_exports` | narrow CommonJS package descriptor values backed by declared `require("./local.js")` bindings |
| `node_modules_commonjs_define_properties_require_binding_descriptors` | narrow CommonJS package declared `Object.defineProperties` descriptor maps with descriptor variables and require-backed values |
| `node_modules_commonjs_module_exports_static_metadata` | narrow CommonJS package static metadata helpers targeting `module.exports` |
| `node_modules_commonjs_define_property_getter_exports` | narrow CommonJS package simple zero-arg `Object.defineProperty(exports, name, { get() { return value; } })` getter exports |
| `node_modules_commonjs_export_assignment_chains` | narrow CommonJS package chained `exports.name = module.exports.name = value` / `module.exports.name = exports.name = value` export assignments |
| `node_modules_commonjs_export_placeholders` | narrow CommonJS package TypeScript/Babel-style `exports.name = void 0` placeholder export initialization |
| `node_modules_commonjs_exports_default_interop` | narrow CommonJS `exports.default` interop with transpiled-ESM `__esModule` marker elision including `exports.__esModule = true` |
| `node_modules_commonjs_function_scope_require` | function-scoped static literal CommonJS require namespace, destructured, bound-default, and direct-default calls |
| `node_modules_commonjs_function_scope_require_alias` | function-scoped static literal CommonJS `require` / `module.require` aliases for namespace, destructured, bound-default, and direct-default calls |
| `node_modules_commonjs_module_exports_arrow` | narrow CommonJS package arrow-function-valued `module.exports` default |
| `node_modules_commonjs_module_exports_array` | narrow CommonJS package array-valued `module.exports` default reads |
| `node_modules_commonjs_module_exports_function` | narrow CommonJS package function-valued `module.exports` default import |
| `node_modules_commonjs_module_exports_identifier` | narrow CommonJS package identifier-valued `module.exports` default import and require call |
| `node_modules_commonjs_module_exports_object` | narrow CommonJS package object-literal `module.exports` identifier exports |
| `node_modules_commonjs_module_exports_object_require_binding` | narrow CommonJS package object-literal `module.exports` named exports backed by declared `require("./local.js")` bindings |
| `node_modules_commonjs_module_exports_object_require_member` | narrow CommonJS package object-literal `module.exports` named exports backed by inline `require("./local.js").member` expressions |
| `node_modules_commonjs_module_exports_object_assign_default` | narrow CommonJS package `Object.assign(...)` dynamic-object `module.exports` whole-value default |
| `node_modules_commonjs_module_exports_object_assign_named` | narrow CommonJS package `module.exports = Object.assign(...)` named/default export metadata |
| `node_modules_commonjs_module_exports_object_assign_exports_target_named` | narrow CommonJS package `module.exports = Object.assign(exports/module.exports, source)` target-mutation metadata |
| `node_modules_commonjs_module_exports_object_assign_define_properties_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.defineProperties({}, descriptors), { ... })` named/default descriptor metadata from the target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_define_properties_create_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.defineProperties(Object.create(proto), descriptors), { ... })` named/default descriptor metadata from a prototype-linked target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_freeze_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.freeze(object), { ... })` named/default metadata from a static wrapped target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_freeze_identifier_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.freeze(declaredObject), { ... })` named/default metadata from a static declared-object wrapped target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_freeze_create_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.freeze(Object.create(proto)), { ... })` named/default metadata from later static sources after a wrapped non-exporting target |
| `node_modules_commonjs_module_exports_object_assign_set_prototype_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.setPrototypeOf(object, proto), { ... })` named/default metadata from a static wrapped target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_seal_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.seal(object), { ... })` named/default metadata from a static wrapped target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_prevent_extensions_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.preventExtensions(object), { ... })` named/default metadata from a static wrapped target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_define_property_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.defineProperty({}, key, descriptor), { ... })` named/default descriptor metadata from the target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_define_property_identifier_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.defineProperty(declaredObject, key, descriptor), { ... })` named/default metadata from a static declared-object target, defineProperty source, and later static sources |
| `node_modules_commonjs_module_exports_object_assign_define_property_create_descriptors_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.defineProperty(Object.create(proto, descriptors), key, descriptor), { ... })` named/default descriptor metadata from the target, defineProperty source, and later static sources |
| `node_modules_commonjs_module_exports_object_assign_define_property_define_properties_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.defineProperty(Object.defineProperties({}, descriptors), key, descriptor), { ... })` named/default descriptor metadata from the target, defineProperty source, and later static sources |
| `node_modules_commonjs_module_exports_object_assign_create_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.create(proto), { ... })` named/default export metadata from later static sources |
| `node_modules_commonjs_module_exports_object_assign_create_descriptors_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.create(proto, descriptors), { ... })` named/default descriptor metadata from the target plus later static sources |
| `node_modules_commonjs_module_exports_object_assign_create_descriptors_identifier_target_named` | narrow CommonJS package `module.exports = Object.assign(Object.create(proto, descriptors), { ... })` named/default descriptor metadata from a descriptor-map variable target plus later static sources |
| `node_modules_commonjs_module_exports_define_properties_named` | narrow CommonJS package `module.exports = Object.defineProperties(...)` named/default export metadata |
| `node_modules_commonjs_module_exports_define_properties_target_named` | narrow CommonJS package `module.exports = Object.defineProperties(api, descriptors)` named/default metadata from a static declared-object target plus descriptor metadata |
| `node_modules_commonjs_module_exports_define_properties_wrapper_target_named` | narrow CommonJS package `module.exports = Object.defineProperties(Object.freeze(api), descriptors)` named/default metadata from a static wrapper target plus descriptor metadata |
| `node_modules_commonjs_module_exports_define_property_named` | narrow CommonJS package `module.exports = Object.defineProperty(...)` named/default export metadata |
| `node_modules_commonjs_module_exports_define_property_target_named` | narrow CommonJS package `module.exports = Object.defineProperty(api, key, descriptor)` named/default metadata from a static declared-object target plus the defined property |
| `node_modules_commonjs_module_exports_define_property_wrapper_target_named` | narrow CommonJS package `module.exports = Object.defineProperty(Object.freeze(api), key, descriptor)` named/default metadata from a static wrapper target plus the defined property |
| `node_modules_commonjs_module_exports_object_create_default` | narrow CommonJS package `Object.create(...)` / `Object.freeze(...)` dynamic-object `module.exports` whole-value default |
| `node_modules_commonjs_module_exports_object_create_descriptors_named` | narrow CommonJS package `module.exports = Object.create(proto, descriptors)` named/default descriptor metadata |
| `node_modules_commonjs_module_exports_object_wrapper_create_descriptors_named` | narrow CommonJS package `module.exports = Object.freeze(Object.create(proto, descriptors))` named/default descriptor metadata from a wrapped descriptor target |
| `node_modules_commonjs_module_exports_object_wrapper_create_descriptor_variants_named` | narrow CommonJS package wrapped `Object.create(proto, descriptors)` named/default descriptor metadata through `Object.seal`, `Object.preventExtensions`, and `Object.setPrototypeOf` |
| `node_modules_commonjs_module_exports_object_wrapper_define_properties_named` | narrow CommonJS package `module.exports = Object.freeze(Object.defineProperties({}, descriptors))` named/default descriptor metadata from a wrapped descriptor target |
| `node_modules_commonjs_module_exports_object_wrapper_define_properties_variants_named` | narrow CommonJS package wrapped `Object.defineProperties({}, descriptors)` named/default descriptor metadata through `Object.seal`, `Object.preventExtensions`, and `Object.setPrototypeOf` |
| `node_modules_commonjs_module_exports_object_wrapper_define_property_named` | narrow CommonJS package `module.exports = Object.freeze(Object.defineProperty(object, key, descriptor))` named/default metadata from a wrapped defineProperty target |
| `node_modules_commonjs_module_exports_object_wrapper_define_property_variants_named` | narrow CommonJS package wrapped `Object.defineProperty(object, key, descriptor)` named/default metadata through `Object.seal`, `Object.preventExtensions`, and `Object.setPrototypeOf` |
| `node_modules_commonjs_module_exports_object_wrapper_assign_named` | narrow CommonJS package `module.exports = Object.freeze(Object.assign(...))` named/default metadata from wrapped assign sources |
| `node_modules_commonjs_module_exports_object_wrapper_assign_variants_named` | narrow CommonJS package wrapped `Object.assign(...)` named/default metadata through `Object.seal`, `Object.preventExtensions`, and `Object.setPrototypeOf` |
| `node_modules_commonjs_module_exports_object_define_property_default` | narrow CommonJS package `Object.defineProperty(...)` dynamic-object `module.exports` whole-value default |
| `node_modules_commonjs_module_exports_object_from_entries_default` | narrow CommonJS package `Object.fromEntries(...)` dynamic-object `module.exports` whole-value default |
| `node_modules_commonjs_module_exports_dynamic_computed` | narrow CommonJS package require bindings preserve runtime-computed whole `module.exports` objects for dynamic key reads |
| `node_modules_commonjs_module_exports_object_from_entries_named` | narrow CommonJS package `module.exports = Object.fromEntries([...])` static entry-array default/named export metadata plus whole-value default |
| `node_modules_commonjs_module_exports_object_from_entries_computed_named` | narrow CommonJS package `module.exports = Object.fromEntries([...])` static computed-key default/named export metadata |
| `node_modules_commonjs_module_exports_object_from_entries_identifier_named` | narrow CommonJS package `module.exports = Object.fromEntries(entries)` default/named metadata from a declared static entry array plus whole-value default |
| `node_modules_commonjs_module_exports_object_from_entries_require_values` | narrow CommonJS package `module.exports = Object.fromEntries([...])` default/named metadata with package-local require-backed values |
| `node_modules_commonjs_module_exports_object_from_entries_object_entries_named` | narrow CommonJS package `module.exports = Object.fromEntries(Object.entries(api))` default/named metadata from a declared static object source |
| `node_modules_commonjs_module_exports_object_from_entries_object_entries_identifier_named` | narrow CommonJS package direct and wrapped `Object.fromEntries(entries)` default/named metadata where `entries` is a declared `Object.entries(api)` source |
| `node_modules_commonjs_module_exports_object_wrapper_from_entries_named` | narrow CommonJS package `module.exports = Object.freeze(Object.fromEntries([...]))` named/default metadata from wrapped static entries |
| `node_modules_commonjs_module_exports_object_wrapper_from_entries_variants_named` | narrow CommonJS package wrapped `Object.fromEntries([...])` named/default metadata through `Object.seal`, `Object.preventExtensions`, and `Object.setPrototypeOf` |
| `node_modules_commonjs_module_exports_object_wrapper_from_entries_object_entries_identifier_variants_named` | narrow CommonJS package wrapped `Object.fromEntries(entries)` named/default metadata through `Object.seal`, `Object.preventExtensions`, and `Object.setPrototypeOf` when `entries` is a declared `Object.entries(api)` source |
| `node_modules_commonjs_module_exports_object_runtime_defaults` | narrow CommonJS package runtime-computed `Object.defineProperties` / `Object.setPrototypeOf` / `Object.preventExtensions` / `Object.seal` / `Object.freeze` dynamic-object `module.exports` whole-value defaults |
| `node_modules_commonjs_module_exports_object_wrappers_named` | narrow CommonJS package static named metadata from `module.exports = Object.freeze`/`Object.seal`/`Object.preventExtensions` object wrappers |
| `node_modules_commonjs_module_exports_object_set_prototype_named` | narrow CommonJS package static own-property metadata from `module.exports = Object.setPrototypeOf(object, proto)` |
| `node_modules_commonjs_module_exports_object_spread_named` | narrow CommonJS package static named metadata from `module.exports = { ...api, extra }` object-spread sources |
| `node_modules_commonjs_module_exports_object_getter_named` | narrow CommonJS package static named metadata from direct `module.exports = { get name() { return value; } }` object-literal getter entries |
| `node_modules_commonjs_object_spread_default` | narrow CommonJS package object-spread `module.exports` whole-value default |
| `node_modules_commonjs_module_exports_value_chains` | narrow CommonJS package whole-value `module.exports = exports.default = fn` assignment chains |
| `node_modules_commonjs_module_exports_object_default` | narrow CommonJS package primitive object-literal `module.exports` whole-value default plus object-valued default and namespace imports |
| `node_modules_commonjs_module_exports_nested_object_default` | narrow CommonJS package nested static object/array-literal `module.exports` whole-value default |
| `node_modules_commonjs_module_exports_object_arrow` | narrow CommonJS package object-literal arrow-function-valued `module.exports` exports |
| `node_modules_commonjs_module_exports_object_function` | narrow CommonJS package object-literal function-valued `module.exports` exports |
| `node_modules_commonjs_module_exports_object_method` | narrow CommonJS package object-literal method shorthand `module.exports` exports |
| `node_modules_commonjs_module_exports_object_literals` | narrow CommonJS package object-literal primitive-valued `module.exports` exports |
| `node_modules_commonjs_module_exports_primitives` | narrow CommonJS package primitive-valued `module.exports` defaults |
| `node_modules_commonjs_module_metadata` | read-only CommonJS `module.filename` / `module.id` / `module.path` / `module.loaded` metadata |
| `node_modules_commonjs_module_metadata_more` | read-only CommonJS `module.parent` / `module.children` / `module.isPreloading` metadata |
| `node_modules_commonjs_module_paths` | read-only CommonJS `module.paths` metadata with a package-local node_modules lookup path |
| `node_modules_commonjs_module_require` | narrow CommonJS package top-level and package-local literal `module.require(...)` member reads/calls/re-exports |
| `node_modules_commonjs_require_alias` | narrow CommonJS package top-level static `require` and `module.require` aliases for package-local member exports |
| `node_modules_commonjs_package_named` | narrow CommonJS package named exports through `exports.name` / `module.exports.name` |
| `node_modules_commonjs_relative_require` | package-local top-level literal `require("./local.js")` member re-export |
| `node_modules_commonjs_relative_require_default` | package-local top-level literal `require("./local.js")` default re-export |
| `node_modules_commonjs_relative_require_direct_default` | package-local direct literal `module.exports = module.require("./local.js")` default re-export |
| `node_modules_commonjs_relative_require_member_default` | package-local direct literal `module.exports = require("./local.js").member` default re-export |
| `node_modules_commonjs_require_destructure` | top-level literal destructured `require("pkg")` bindings for narrow CommonJS named exports |
| `node_modules_commonjs_require_direct_function` | top-level literal direct `require("pkg")(...)` calls for function-valued CommonJS module exports |
| `node_modules_commonjs_require_direct_member` | top-level literal direct `require("pkg").name` reads/calls for narrow CommonJS named exports |
| `node_modules_commonjs_require_direct_value` | top-level literal direct `require("pkg")` reads for primitive-valued CommonJS module exports |
| `node_modules_commonjs_require_function` | top-level literal `require("pkg")` calls for function-valued CommonJS module exports |
| `node_modules_commonjs_require_named` | top-level literal `require("pkg")` member reads/calls for narrow CommonJS named exports |
| `node_modules_commonjs_require_side_effect` | side-effect-only top-level literal `require("pkg")` package initialization |
| `node_modules_commonjs_wrapper_globals` | `__filename` / `__dirname` string constants in CommonJS package sources |
| `node_modules_js_package` | basic pure-JS package import through allowJs |
| `node_modules_js_package_relative_import` | pure-JS package entry importing a package-local JS module |
| `node_modules_package_exports` | TypeScript package source imports through package exports |
| `node_modules_package_imports` | TypeScript package source imports through package imports |
| `node_modules_package_main` | JavaScript package source imports through package main fallback |
| `node_modules_package_namespace` | TypeScript package namespace imports through package exports |
| `node_modules_package_side_effect` | package side-effect-only imports through package exports |
| `node_modules_transitive_native_addon` | expected diagnostic for package source importing a native addon package |
| `number_constants` | Number static constants |
| `number_static_more` | Number.is* predicates over any value plus parseInt/parseFloat coercion, radix support, radix inference, and invalid-radix handling |
| `json` | JSON.stringify of primitives, arrays, typed objects |
| `switch` | number + string switch with fall-through |
| `switch_exhaustive` | exhaustive finite-domain switch over literal unions and booleans |
| `switch_exhaustive_missing` | expected diagnostic for a missing finite-domain switch case |
| `symbols` | Symbol values, global registry, well-known symbols, typeof |
| `symbol_bigint_object_methods` | Symbol/BigInt toLocaleString and valueOf object methods |
| `tagged_templates` | tagged template calls with cooked string segments |
| `string_raw` | String.raw tagged templates preserving raw escape text |
| `tail_calls` | direct self-tail recursion lowered to a loop |
| `typed_object_has_own` | typed Object.hasOwn, hasOwnProperty, and propertyIsEnumerable field checks |
| `typed_object_methods` | typed Object toString/toLocaleString/valueOf prototype fallback |
| `typed_object_property_names` | typed Object.getOwnPropertyNames field-list expansion |
| `typed_property_descriptor` | typed Object/Reflect field data descriptors |
| `typed_property_descriptors` | typed Object.getOwnPropertyDescriptors field descriptor maps |
| `reflect_get_receiver_typed` | Reflect.get optional receiver evaluation for typed arrays, objects, and Buffer |
| `typed_reflect_get` | typed Reflect.get field reads |
| `typed_reflect_has` | typed Reflect.has field checks |
| `typed_reflect_own_keys` | typed Reflect.ownKeys field-list expansion |
| `typed_reflect_set` | typed Reflect.set field writes |
| `regex` | PCRE2-backed regex: test, replace, match, split, flags |
| `regex_captures` | capture groups for non-global `.match()` |
| `regex_pcre2` | lookahead/lookbehind, named capture syntax, Unicode properties, dotAll |
| `regexp_constructor` | new RegExp and callable RegExp from string pattern and flags |
| `regexp_escape` | RegExp.escape literal-pattern escaping |
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
| `proxy_traps` | dynamic Proxy object traps plus function apply trap and enumerable ownKeys filtering |
| `proxy_ownkeys_invariants` | Proxy ownKeys duplicate, non-configurable, and non-extensible target invariant checks |
| `proxy_descriptor_invariants` | Proxy getOwnPropertyDescriptor non-configurable descriptor and non-extensible target invariant checks |
| `proxy_get_set_define_invariants` | Proxy get/set/defineProperty non-configurable and non-extensible target invariant checks |
| `proxy_has_delete_invariants` | Proxy has/deleteProperty non-configurable and non-extensible target invariant checks |
| `proxy_prototype_extensibility_invariants` | Proxy get/set prototype and extensibility trap invariant checks |
| `proxy_construct` | bounded Proxy construct trap dispatch through dynamic Reflect.construct |
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
| `discriminated_union_nested` | nested dotted discriminant narrowing over dynamic interface fields |
| `discriminated_unions` | literal discriminant checks over interface-shaped union values |
| `discriminated_union_switch` | switch-based literal discriminant narrowing over interface-shaped union values |
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
| `dynamic_require` | top-level finite const string `require(name)` resolved as an AOT module edge, including static concatenation, template expressions, side-effect-only conditionals, value-returning `module.exports` dispatch, and named-export object materialization |
| `dynamic_require_commonjs_shapes` | dynamic require dispatch materializes object-literal CommonJS exports that spread package-local require results |
| `dynamic_require_literal_union` | finite string-literal union annotations provide AOT dynamic require alternatives for parameters and top-level variables |
| `dynamic_require_manifest` | explicit dynamic require manifest compiles a non-finite `require(variable)` allow-list into the AOT graph and finite runtime dispatch |
| `dynamic_require_static_collections` | top-level const string maps/arrays provide finite AOT alternatives for dynamic require element/property access |
| `dynamic_require_unknown` | expected diagnostic for non-finite `require(variable)` |
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
| `date_now` | Date.now current epoch millisecond timestamp |
| `date_ignored_arguments` | Date zero-argument methods evaluate and ignore extra arguments |
| `date_callable` | callable Date returns current local date string and ignores evaluated arguments |
| `date_instances` | Date instances from current time or millisecond timestamps with getTime/valueOf/stringification |
| `date_legacy_year` | Date legacy getYear and setYear local-year behavior with ignored extra arguments |
| `date_locale_parts` | Date locale date/time part formatting |
| `date_local_constructor` | Date local-time numeric constructor overload with overflow, short-year normalization, and ignored extra arguments |
| `date_local_getters` | Date local-time component getters and timezone offset |
| `date_local_setters` | Date local-time mutator methods with normalized timestamp return values and ignored extra arguments |
| `date_parse` | Date.parse optional argument handling and string Date constructor over deterministic ISO strings |
| `date_set_time` | Date.setTime mutation, ignored extra arguments, and copy construction from Date instances |
| `date_to_iso_string` | Date.toISOString UTC formatting and invalid-date RangeError |
| `date_to_date_string` | Date.toDateString local date formatting |
| `date_to_time_string` | Date.toTimeString local time and timezone formatting |
| `date_to_json` | Date.toJSON delegates to UTC ISO formatting |
| `date_to_json_invalid` | Date.toJSON returns null for invalid dates and ignores evaluated key arguments |
| `date_to_utc_string` | Date.toUTCString/toGMTString UTC text formatting |
| `date_utc` | Date.UTC optional argument defaults, ignored extras, and numeric normalization |
| `date_utc_getters` | Date UTC component getters |
| `date_utc_setters` | Date UTC mutator methods with normalized timestamp return values and ignored extra arguments |
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
| `runtime_eval` | constant expression eval compiles AOT |
| `runtime_eval_manifest` | manifest-listed non-constant eval source dispatches to generated AOT constants |
| `runtime_eval_unknown` | expected diagnostic for unknown-source `eval(...)` runtime compilation |
| `runtime_function_call` | constant-body direct `Function(...)` compiles AOT |
| `runtime_function_call_unknown` | expected diagnostic for unknown-source direct `Function(...)` runtime compilation |
| `runtime_function_constructor` | constant-body `new Function(...)` compiles AOT |
| `runtime_function_constructor_unknown` | expected diagnostic for unknown-source `new Function(...)` runtime compilation |
| `runtime_function_manifest` | manifest-listed non-constant `Function(...)` and `new Function(...)` bodies dispatch to generated AOT constants |
| `satisfies_expression` | TypeScript satisfies expressions erase to their runtime operand |
| `set_keys` | Set.keys alias for Set.values |
| `string_char_code_at` | String.charCodeAt UTF-16 code-unit lookup |
| `string_search_positions` | String indexOf/includes/startsWith/endsWith/lastIndexOf position args |
| `string_at` | String.at positive and negative index lookup |
| `string_boolean_constructors` | callable String/Boolean typed and dynamic coercion |
| `string_concat` | String.concat |
| `string_codepoints` | String.fromCharCode + codePointAt |
| `string_from_code_point` | String.fromCodePoint Unicode scalar construction |
| `string_raw` | String.raw tagged templates preserving raw escape text |
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
| `url_base` | URL constructor and URL.canParse support for bounded base URL resolution |
| `url_can_parse` | URL.canParse support for the bounded absolute URL subset |
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
