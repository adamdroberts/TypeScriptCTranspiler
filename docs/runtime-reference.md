# Runtime reference

The `tsc_*` C runtime — everything in `runtime/tsc_runtime.h` and `runtime/tsc_runtime.c` — linked into every produced binary.

Conventions:

- All allocations go through `TSC_GC_MALLOC` (Boehm GC) or `TSC_GC_MALLOC_ATOMIC` (raw bytes, no pointer scan). Under `-DTSC_NO_GC` these expand to `calloc` and the binary leaks.
- Strings are **immutable UTF-8** with explicit length. Every `tsc_str_*` mutation returns a fresh `tsc_str_t*`.
- `double` is the numeric type for all JS numbers (IEEE 754).
- `bool` comes from `<stdbool.h>`.

## Bootstrap

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_bootstrap` | `void(int argc, char** argv)` | Called once from `main`. Initializes GC, stores argv for `process.argv` / `process.exit`, seeds `rand()`. |
| `tsc_panic` | `void(const char* msg)` | Fatal error. Prints `"tsc: panic: <msg>"` to stderr and `abort()`s. |
| `tsc_argc` / `tsc_argv` | globals | Populated by `tsc_bootstrap`. |

## Strings (`tsc_str_t`)

```c
typedef struct tsc_str {
    size_t len;         // bytes (not codepoints, for now)
    const char* data;   // UTF-8 payload, NUL-terminated for C interop but len is authoritative
} tsc_str_t;
```

### Construction

| Symbol | Signature | Notes |
|--------|-----------|-------|
| `tsc_str_from_lit` | `(const char*, size_t) -> tsc_str_t*` | Wraps a string literal with no copy. |
| `tsc_str_from_cstr` | `(const char*) -> tsc_str_t*` | Copies a null-terminated C string. |
| `tsc_str_from_num` | `(double) -> tsc_str_t*` | JS-compatible shortest round-trip number formatting. |
| `tsc_str_from_num_radix` | `(double, double) -> tsc_str_t*` | `Number.prototype.toString(radix)` formatting with 2..36 radix validation. |
| `tsc_str_from_num_fixed` | `(double, double) -> tsc_str_t*` | `Number.prototype.toFixed(fractionDigits)` fixed-point formatting with 0..100 digit validation. |
| `tsc_str_from_num_exponential` | `(double, double, bool) -> tsc_str_t*` | `Number.prototype.toExponential(fractionDigits?)` scientific formatting with JS-style exponent normalization. |
| `tsc_str_from_num_precision` | `(double, double, bool) -> tsc_str_t*` | `Number.prototype.toPrecision(precision?)` significant-digit formatting with fixed/exponential selection. |
| `tsc_str_from_bool` | `(bool) -> tsc_str_t*` | `"true"` / `"false"`. |
| `tsc_str_from_char_code_n` | `(size_t n, ...) -> tsc_str_t*` | `String.fromCharCode(...)`, encoding UTF-16 code units as UTF-8. |
| `tsc_str_from_code_point_n` | `(size_t n, ...) -> tsc_str_t*` | `String.fromCodePoint(...)`, validating Unicode scalar values and encoding UTF-8. |

### Equality and comparison

| Symbol | Signature |
|--------|-----------|
| `tsc_str_eq` | `(const tsc_str_t*, const tsc_str_t*) -> bool` |
| `tsc_str_cmp` | `(const tsc_str_t*, const tsc_str_t*) -> int` (strcmp-style) |
| `tsc_str_locale_compare` | `(const tsc_str_t*, const tsc_str_t*) -> double` (`localeCompare`-style -1/0/1) |

### Methods (match JS `String.prototype`)

| Symbol | Returns | JS equivalent |
|--------|---------|---------------|
| `tsc_str_length` | `double` | `.length` |
| `tsc_str_char_at(s, i)` | `tsc_str_t*` | `.charAt(i)` |
| `tsc_str_at(s, i)` | `tsc_str_t*` | `.at(i)`, negative indices OK |
| `tsc_str_char_code_at(s, i)` | `double` | `.charCodeAt(i)`, using JS UTF-16 indices |
| `tsc_str_code_point_at(s, i)` | `double` | `.codePointAt(i)`, using JS UTF-16 indices |
| `tsc_str_index_of(h, n, position)` | `double` | `.indexOf(n, position?)` (-1 if missing) |
| `tsc_str_last_index_of(h, n, position)` | `double` | `.lastIndexOf(n, position?)` |
| `tsc_str_includes(h, n, position)` | `bool` | `.includes(n, position?)` |
| `tsc_str_starts_with(s, p, position)` | `bool` | `.startsWith(p, position?)` |
| `tsc_str_ends_with(s, p, end_position)` | `bool` | `.endsWith(p, endPosition?)` |
| `tsc_str_slice(s, start, end)` | `tsc_str_t*` | `.slice(start, end)`, negative indices OK |
| `tsc_str_substring(s, start, end)` | `tsc_str_t*` | `.substring(start, end)`, clamp/swap semantics |
| `tsc_str_substr(s, start, length)` | `tsc_str_t*` | `.substr(start, length)`, negative-start and length clamping semantics |
| `tsc_str_to_upper` | `tsc_str_t*` | `.toUpperCase()` (ASCII only) |
| `tsc_str_to_lower` | `tsc_str_t*` | `.toLowerCase()` (ASCII only) |
| `tsc_str_normalize(s, form)` | `tsc_str_t*` | `.normalize(form)`, ICU-backed NFC/NFD/NFKC/NFKD |
| `tsc_str_trim` | `tsc_str_t*` | `.trim()` |
| `tsc_str_trim_start` | `tsc_str_t*` | `.trimStart()` |
| `tsc_str_trim_end` | `tsc_str_t*` | `.trimEnd()` |
| `tsc_str_repeat(s, n)` | `tsc_str_t*` | `.repeat(n)` |
| `tsc_str_pad_start(s, len, pad)` | `tsc_str_t*` | `.padStart(len, pad)` |
| `tsc_str_pad_end(s, len, pad)` | `tsc_str_t*` | `.padEnd(len, pad)` |
| `tsc_str_replace(s, needle, repl)` | `tsc_str_t*` | `.replace("a", "b")` (first match), with JS replacement-string tokens |
| `tsc_str_replace_all(s, needle, repl)` | `tsc_str_t*` | `.replaceAll("a", "b")` (all matches), with JS replacement-string tokens |
| `tsc_str_concat(a, b)` | `tsc_str_t*` | `a + b` and `.concat(...)` |
| `tsc_str_split(s, sep)` | `tsc_array_t*` | `.split("a")` → array of strings |
| `tsc_str_split_limit(s, sep, limit)` | `tsc_array_t*` | Bounded split helper using an already-normalized uint32 limit |
| `tsc_str_split_limit_num(s, sep, limit)` | `tsc_array_t*` | `.split("a", limit)` with JS-style `ToUint32` limit coercion |
| `tsc_str_chars(s)` | `tsc_array_t*` | string `for...of` values, one UTF-8 code point per string |

## Numbers

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_num_mod` | `(double, double) -> double` | `fmod` — JS-style modulo for the `%` operator. |
| `tsc_parse_float` | `(const tsc_str_t*) -> double` | Equivalent of `parseFloat`. Returns NaN on failure. |
| `tsc_parse_int` | `(const tsc_str_t*, double radix) -> double` | Equivalent of `parseInt`, including omitted/zero radix inference and invalid-radix `NaN`. |
| `tsc_math_random` | `() -> double` | `Math.random()`, range [0, 1). Uses `rand()`. |
| `tsc_math_round` | `(double) -> double` | `Math.round()`, preserving JavaScript negative zero. |
| `tsc_math_sign` | `(double) -> double` | `Math.sign()`, preserving signed zero and `NaN`. |
| `tsc_math_imul` | `(double, double) -> double` | `Math.imul`, using JS ToInt32 coercion and signed 32-bit result wrapping. |
| `tsc_math_clz32` | `(double) -> double` | `Math.clz32`, using JS ToUint32 coercion. |
| `tsc_math_fround` | `(double) -> double` | `Math.fround`, rounded through C `float` and returned as `double`. |

## Arrays (`tsc_array_t`)

Type-erased dynamic vector. Element size + kind known only to the emitter — the emitter generates the right access via the `TSC_ARR(T, arr, i)` macro.

```c
typedef struct tsc_array {
    size_t len, cap, es;  // element size in bytes
    bool extensible, sealed, frozen;  // dynamic Object/Reflect state
    size_t iter_pos;  // materialized generator .next() cursor
    bool iter_has_return, iter_return_consumed;
    tsc_value_t iter_return;  // explicit generator return value, exposed once
    void* data;
} tsc_array_t;
```

| Symbol | Signature | Notes |
|--------|-----------|-------|
| `tsc_array_new(es, cap)` | `tsc_array_t*` | Empty array with capacity. |
| `tsc_array_from_buf(es, src, n)` | `tsc_array_t*` | Copy `n` elements from `src`. |
| `tsc_array_reserve(arr, cap)` | `void` | Grow capacity to at least `cap`. |
| `tsc_array_push_raw(arr, &elem)` | `void` | Append; grows if needed. |
| `tsc_array_pop_raw(arr)` | `void` | Decrement `len`. Caller reads the element first. |
| `tsc_array_shift_raw(arr)` | `void` | Remove front (shifts remaining). |
| `tsc_array_unshift_raw(arr, &elem)` | `void` | Prepend. |
| `tsc_array_reverse(arr)` | `tsc_array_t*` | In-place. Returns the same array. |
| `tsc_array_to_reversed(arr)` | `tsc_array_t*` | Reversed copy. Leaves the input unchanged. |
| `tsc_array_fill(arr, &elem, start, end)` | `tsc_array_t*` | In-place range fill. Returns the same array. |
| `tsc_array_copy_within(arr, target, start, end)` | `tsc_array_t*` | In-place overlapping copy. Returns the same array. |
| `tsc_array_with(arr, index, &elem)` | `tsc_array_t*` | Non-mutating copy with one replaced element. Supports negative indices. |
| `tsc_array_to_spliced(arr, start, delete_count, argc, items)` | `tsc_array_t*` | Non-mutating splice copy. `argc` preserves omitted-argument semantics. |
| `tsc_array_slice(arr, start, end)` | `tsc_array_t*` | New array with copied range. |
| `tsc_array_append(dst, src)` | `tsc_array_t*` | Append `src`'s elements to `dst`. |
| `tsc_array_flat_once(outer, elem_size)` | `tsc_array_t*` | Flatten one homogeneous nested-array level. |
| `tsc_array_length(arr)` | `double` | For `.length` property. |
| `tsc_array_has_own_key(arr, key)` | `bool` | Own-property test for typed array indexes and `length`. |
| `tsc_array_property_is_enumerable_key(arr, key)` | `bool` | Enumerable own-property test for typed array indexes. `length` is non-enumerable. |
| `TSC_ARR(T, arr, i)` | lvalue | Macro for typed element access — `((T*)arr->data)[(size_t)i]`. |
| `tsc_array_oob(arr, i)` | `void` | Placeholder bounds-check hook (silent today, planned to throw `RangeError`). |

High-order methods like `.map`/`.filter`/`.reduce` are **not** runtime functions — they're expanded inline in the emitter (`emitArrayHof` in `src/emit/index.ts`).

`Object.entries` uses `tsc_object_entry_t` elements inside a normal `tsc_array_t`. The struct stores the string key plus one typed value slot (`num`, `boolean`, or `ptr`) chosen by the emitter for the homogeneous object field type.

## Dynamic Values (`tsc_value_t`)

NaN-boxed `uint64_t` used for `any`, `unknown`, heterogeneous unions, dynamic JSON results, heterogeneous dynamic arrays/objects, and boxed accessor function identities returned from descriptor reads.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_value_num/bool/string/array/object(...)` | `tsc_value_t` | Box specialized values into the dynamic representation |
| `tsc_value_null()` / `tsc_value_undefined()` | `tsc_value_t` | Dynamic nullish sentinels |
| `tsc_value_as_num/bool/string/array(v)` | varies | Unbox dynamic values after TypeScript narrowing, typed assignment/call coercion, or runtime coercion |
| `tsc_value_to_string(v)` | `tsc_str_t*` | JS-like string conversion for console/template coercion; dynamic arrays use comma-join conversion |
| `tsc_value_method_to_string(v, radix)` | `tsc_str_t*` | Dynamic `.toString(...)`; number receivers honor `radix`, while other values use ordinary dynamic string conversion |
| `tsc_value_method_to_fixed(v, digits)` | `tsc_str_t*` | Dynamic number `.toFixed(...)` formatting |
| `tsc_value_method_to_exponential(v, digits)` | `tsc_str_t*` | Dynamic number `.toExponential(...)` formatting |
| `tsc_value_method_to_precision(v, precision)` | `tsc_str_t*` | Dynamic number `.toPrecision(...)` formatting |
| `tsc_value_typeof(v)` | `tsc_str_t*` | Runtime `typeof` result for dynamic values |
| `tsc_value_is_truthy(v)` | `bool` | JS truthiness for dynamic values |
| `tsc_value_is_nullish(v)` | `bool` | Dynamic `??` null/undefined test |
| `tsc_value_is_array(v)` | `bool` | Runtime check used by dynamic `Array.isArray` |
| `tsc_value_add/sub/mul/div/mod/pow(a, b)` | `tsc_value_t` | Dynamic arithmetic and `+` string concatenation |
| `tsc_value_pos/neg/bit_not(v)` | `tsc_value_t` | Dynamic unary `+`, `-`, and `~` using JS-style numeric coercion |
| `tsc_value_bit_and/bit_or/bit_xor/shl/shr/ushr(a, b)` | `tsc_value_t` | Dynamic bitwise operators with JS-style numeric coercion, int32/uint32 conversion, and masked shift counts |
| `tsc_value_eq(a, b)` | `bool` | Dynamic equality for numbers, booleans, strings, nullish sentinels, object identity, and boxed function identity |
| `tsc_value_object_is(a, b)` | `bool` | SameValue comparison used by `Object.is`, including `NaN` and signed-zero handling |
| `tsc_value_cmp(a, b)` | `int` | Dynamic relational comparison; returns `2` for unordered/NaN comparisons |
| `tsc_value_method_*(recv, ...)` | `tsc_value_t` | Runtime dispatch for common dynamic string/array methods such as `includes`, `indexOf`, `lastIndexOf`, `localeCompare`, `match`, `matchAll`, `normalize`, `padStart`, `padEnd`, `repeat`, `replace`, `replaceAll`, `slice`, `split`, `split(RegExp)`, `substr`, `substring`, `trimStart`, `trimEnd`, `join`, `push`, `pop`, `shift`, `unshift`, `at`, `concat`, `copyWithin`, `fill`, `flat`, `keys`, `values`, `sort`, `splice`, `toReversed`, `toSorted`, `toSpliced`, `with`, and casing/trim helpers |
| `tsc_value_json_stringify(v)` | `tsc_str_t*` | Recursive dynamic JSON stringify; object properties whose values are `undefined` or boxed function identities are omitted, while array slots stringify as `null` |
| `tsc_value_apply_function(fn, this_arg, args)` | `tsc_value_t` | Dynamic `Reflect.apply` dispatch for boxed accessor function identities returned from descriptor `get`/`set` fields |
| `tsc_value_dispose_sync(value)` | `void` | Calls a dynamic value's `[Symbol.dispose]()` method, skipping nullish values and throwing when the value is not synchronously disposable |
| `tsc_value_dispose_async(value)` | `tsc_promise_t*` | Calls a dynamic value's `[Symbol.asyncDispose]()` method with the value as receiver and assimilates its result into a Promise |
| `tsc_promise_resolve/reject(result)` | `tsc_promise_t*` | Allocates an immediately fulfilled/rejected Promise record used by the settled Promise subset |
| `tsc_promise_after_async_dispose_many(resources, count, result)` | `tsc_promise_t*` | Disposes dynamic resources sequentially in reverse order, continues after cleanup rejection, and settles with the first cleanup rejection or the body result |
| `tsc_promise_resolve_fs_stats(result)` | `tsc_promise_t*` | Allocates an immediately fulfilled typed `Promise<FSStats>` side-channel record |
| `tsc_promise_resolve_buffer(result)` | `tsc_promise_t*` | Allocates an immediately fulfilled typed `Promise<Buffer>` side-channel record |
| `tsc_async_iterator_get(value)` | `tsc_value_t` | Resolves a dynamic async iterator through `[Symbol.asyncIterator]()` when present |
| `tsc_async_iterator_next(iterator)` | `tsc_promise_t*` | Calls a dynamic async iterator's `.next()` and assimilates its result into a Promise |
| `tsc_async_iterator_return(iterator)` | `tsc_promise_t*` | Calls a dynamic async iterator's `.return()` and assimilates its result for bounded iterator close |
| `tsc_promise_is_fulfilled/is_rejected(p)` | `bool` | State checks used by synchronous `then`/`catch`/`finally` lowering |
| `tsc_promise_value/reason(p)` | `tsc_value_t` | Reads the stored fulfilled value or rejection reason |
| `tsc_promise_fs_stats_value(p)` | `tsc_fs_stats_t*` | Reads the typed `FSStats` fulfilled value side-channel |
| `tsc_promise_buffer_value(p)` | `tsc_buffer_t*` | Reads the typed `Buffer` fulfilled value side-channel |
| `tsc_value_get_prop(v, key)` | `tsc_value_t` | Dynamic object property read through the prototype chain plus array/string own-property reads, returning `undefined` when absent |
| `tsc_value_get_prop_cached(v, key, cache)` | `tsc_value_t` | Shape-validated dynamic own-property read cache helper used by generated literal property and string-key element read sites; falls back to `tsc_value_get_prop` semantics for proxies, arrays, strings, functions, prototype lookups, and absent keys |
| `tsc_value_get_prop_receiver(v, key, receiver)` | `tsc_value_t` | Dynamic `Reflect.get` read with an explicit receiver argument for accessor dispatch |
| `tsc_value_get_prop_receiver_cached(v, key, receiver, cache)` | `tsc_value_t` | Shape-validated dynamic own-property read cache helper for generated receiver-aware `Reflect.get(...)` sites; falls back to receiver-aware lookup for proxies, prototypes, arrays, strings, functions, and absent keys |
| `tsc_value_get_index(v, index)` | `tsc_value_t` | Dynamic array or string index read, returning `undefined` when absent |
| `tsc_value_set_index(v, index, value)` | `bool` | Dynamic array index write, extending with `undefined` for skipped slots |
| `tsc_value_set_prop(v, key, value)` | `bool` | Dynamic object data/accessor-property write used by direct dynamic property assignment and three-argument `Reflect.set(...)` |
| `tsc_value_set_prop_cached(v, key, value, cache)` | `bool` | Shape-validated dynamic own-property write cache helper used by generated direct dynamic property/string-key assignments; falls back to descriptor-aware `tsc_value_set_prop` semantics for proxies, arrays, inherited writes, and absent keys |
| `tsc_value_set_prop_receiver(v, key, value, receiver)` | `bool` | Dynamic `Reflect.set` write with an explicit receiver; inherited or missing writable data properties are written to the receiver |
| `tsc_value_set_prop_receiver_cached(v, key, value, receiver, cache)` | `bool` | Shape-validated dynamic own-property write cache helper for receiver-aware `Reflect.set`; cached writable data properties still write through the explicit receiver |
| `tsc_reflect_set_prop_cached(v, key, value, cache)` | `bool` | `Reflect.set` target-validated wrapper around `tsc_value_set_prop_cached` for generated three-argument dynamic `Reflect.set(...)` sites |
| `tsc_reflect_set_prop_receiver_cached(v, key, value, receiver, cache)` | `bool` | `Reflect.set` target-validated wrapper around `tsc_value_set_prop_receiver_cached` for generated four-argument dynamic `Reflect.set(...)` sites |
| `tsc_value_define_property_desc(v, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable)` | `bool` | Dynamic data descriptor definition used by `Object.defineProperty`, `Object.defineProperties`, and `Reflect.defineProperty`; presence bits preserve omitted fields on existing descriptors, omitted new-property values are lowered as `undefined`, compatible non-configurable writable data redefinitions are allowed, and dynamic arrays support bounded dense-index and `length` descriptors with extensibility/seal/freeze checks |
| `tsc_value_define_accessor_desc(v, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable)` | `bool` | Dynamic accessor descriptor definition used by `Object.defineProperty`, `Object.defineProperties`, and `Reflect.defineProperty`; presence bits preserve omitted hooks/flags on configurable redefinition, explicit undefined hooks become null callbacks, compatible non-configurable accessor redefinitions are allowed, and descriptor reads expose stable boxed `get`/`set` identities or own `undefined` fields for absent hooks |
| `tsc_value_object_create(proto)` | `tsc_value_t` | Dynamic object allocation with an object/null prototype |
| `tsc_value_is_prototype_of(proto, object)` | `bool` | Dynamic `Object.prototype.isPrototypeOf` prototype-chain query |
| `tsc_value_get/set_prototype_of(v, proto)` | `tsc_value_t` / `bool` | Dynamic `Object`/`Reflect` prototype access and mutation |
| `tsc_value_has_prop(v, key)` | `bool` | Dynamic property existence through the prototype chain, plus array/string own properties |
| `tsc_value_has_own_prop(v, key)` | `bool` | Own-property existence used by `Object.hasOwn` and `Object.prototype.hasOwnProperty`, including dynamic array/string indexes and `length` |
| `tsc_value_property_is_enumerable(v, key)` | `bool` | Own enumerable-property check used by `Object.prototype.propertyIsEnumerable`; dynamic string/array indexes are enumerable and `length` is not |
| `tsc_value_delete_prop(v, key)` | `bool` | Own-property descriptor-aware deletion; dynamic array/string `length` and string indexes return false |
| `tsc_value_is_extensible/prevent_extensions(v)` | `bool` | Dynamic object/array extensibility state used by `Object` / `Reflect` APIs |
| `tsc_value_seal/freeze/is_sealed/is_frozen(v)` | `bool` | Dynamic object/array seal/freeze state and descriptor/write/delete/mutator enforcement |
| `tsc_value_own_keys(v)` | `tsc_array_t*` | Reflect-style own string keys including non-enumerable properties; dynamic arrays/strings include numeric indexes plus `length` |
| `tsc_value_get_own_property_descriptor(v, key)` | `tsc_value_t` | Dynamic data/accessor descriptor object or `undefined`; accessor descriptors expose stable boxed `get`/`set` identities or own `undefined` fields for absent hooks, dynamic arrays expose index and `length` data descriptors with seal/freeze-aware flags, and dynamic strings expose read-only index/length descriptors |
| `tsc_value_get_own_property_descriptors(v)` | `tsc_value_t` | Dynamic object containing descriptor objects for all own dynamic object/array/string properties, including accessor `get`/`set` identities or own `undefined` absent-hook fields and array seal/freeze-aware flags |
| `tsc_value_object_assign(target, source)` | `tsc_value_t` | Dynamic enumerable-property copy used by `Object.assign`; supports dynamic object/array targets, invokes object source getters, and copies array/string index properties |
| `tsc_value_length(v)` | `double` | `.length` for dynamic arrays/strings |
| `tsc_value_iter_values(v)` | `tsc_array_t*` | Dynamic `for...of` value list for boxed arrays and strings; non-iterable values throw catchable runtime exceptions |
| `tsc_value_method_entries(v)` | `tsc_value_t` | Dynamic `Array.prototype.entries()`, returning dynamic `[key, value]` arrays with string index keys |
| `tsc_object_new/set/define/define_accessor/get(...)` | varies | Runtime backing store for dynamic objects, data descriptors, and accessor descriptors with optional callback environments |
| `tsc_value_object_keys/values(v)` | `tsc_array_t*` | Enumerable `Object.keys` / `Object.values` for dynamic objects, arrays, and strings |
| `tsc_value_object_entries(v)` | `tsc_array_t*` | Enumerable `Object.entries` for dynamic objects/arrays/strings, returning dynamic `[key, value]` arrays |
| `tsc_value_object_from_entries(entries)` | `tsc_value_t` | Dynamic `Object.fromEntries`, accepting dynamic arrays of dynamic `[key, value]` pairs |
| `tsc_json_parse(text)` | `tsc_value_t` | Recursive JSON parser for objects, arrays, strings, numbers, booleans, and null |

## Errors (`tsc_error_t`)

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_suppressed_error_new(error, suppressed, message)` | `tsc_error_t*` | Creates a `SuppressedError`-named Error value with dynamic `error` and `suppressed` fields |
| `tsc_error_to_string(error)` | `tsc_str_t*` | Formats the Error name and message for `.toString()` and exception stringification |

## BigInt (`tsc_bigint_t`)

GMP-backed arbitrary-precision integers. `bigint` values are heap-allocated wrappers around `mpz_t`; operators are emitted as runtime calls.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_bigint_from_lit(lit)` | `tsc_bigint_t*` | BigInt literal construction, including `0x`, `0o`, and `0b` prefixes |
| `tsc_bigint_from_str(s)` | `tsc_bigint_t*` | `BigInt(string)` |
| `tsc_bigint_from_num(n)` | `tsc_bigint_t*` | `BigInt(number)`, finite integers only |
| `tsc_bigint_from_bool(b)` | `tsc_bigint_t*` | `BigInt(boolean)` |
| `tsc_bigint_add/sub/mul/div/mod/pow(a, b)` | `tsc_bigint_t*` | BigInt arithmetic |
| `tsc_bigint_cmp(a, b)` | `int` | Relational comparison |
| `tsc_bigint_eq(a, b)` | `bool` | Equality comparison |
| `tsc_bigint_to_string(a, radix)` | `tsc_str_t*` | `.toString(radix?)` |

## Symbols (`tsc_symbol_t`)

Heap-allocated unique symbol identities with an optional description and a small global registry for `Symbol.for`.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_symbol_new(description)` | `tsc_symbol_t*` | `Symbol(description?)`, always creates a new identity |
| `tsc_symbol_for(key)` | `tsc_symbol_t*` | `Symbol.for(key)` global registry lookup/create |
| `tsc_symbol_key_for(sym)` | `tsc_str_t*` | `Symbol.keyFor(sym)`, `NULL` for non-global symbols |
| `tsc_symbol_iterator()` | `tsc_symbol_t*` | Singleton `Symbol.iterator` |
| `tsc_symbol_async_iterator()` | `tsc_symbol_t*` | Singleton `Symbol.asyncIterator` |
| `tsc_symbol_dispose()` | `tsc_symbol_t*` | Singleton `Symbol.dispose` |
| `tsc_symbol_async_dispose()` | `tsc_symbol_t*` | Singleton `Symbol.asyncDispose` |
| `tsc_symbol_description(sym)` | `tsc_str_t*` | `.description`, `NULL` when absent |
| `tsc_symbol_to_string(sym)` | `tsc_str_t*` | `.toString()` / console stringification |

## WeakRef (`tsc_weakref_t`)

Typed weak-reference wrappers store a target pointer and return it from `.deref()`.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_weakref_new(target)` | `tsc_weakref_t*` | `new WeakRef(target)` |
| `tsc_weakref_deref(ref)` | `void*` | `.deref()`, cast back to the typed target by the emitter |

## FinalizationRegistry (`tsc_finregistry_t`)

A stub registry that tracks `unregister` tokens but never fires the cleanup callback (no GC-finalizer plumbing). The cleanup callback supplied to `new FinalizationRegistry<T>(cb)` is evaluated for side effects at construction time and discarded.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_finregistry_new()` | `tsc_finregistry_t*` | `new FinalizationRegistry(cb)` (the callback is not stored). |
| `tsc_finregistry_register(r, token)` | `void` | Records a token (`NULL` when `register(target, heldValue)` is called without an explicit token). |
| `tsc_finregistry_unregister(r, token)` | `bool` | Removes every registration whose token matches and reports whether any were removed. |

## Maps and Sets (`tsc_map_t`, `tsc_set_t`)

Type-erased linear-scan collections. Key equality is chosen by a `tsc_key_kind_t` tag passed at construction:

| Tag | Value | Equality |
|-----|-------|----------|
| `TSC_KEY_NUM` | 0 | `double ==` |
| `TSC_KEY_STR` | 1 | `tsc_str_eq` |
| `TSC_KEY_PTR` | 2 | pointer `==` (for class instances) |
| `TSC_KEY_BOOL` | 3 | `bool ==` |

### Map

| Symbol | Signature |
|--------|-----------|
| `tsc_map_new(ks, vs, kk, cap)` | `tsc_map_t*` |
| `tsc_map_set_raw(m, &k, &v)` | `void` |
| `tsc_map_get_raw(m, &k, &out)` | `bool` (true if present) |
| `tsc_map_has_raw(m, &k)` | `bool` |
| `tsc_map_delete_raw(m, &k)` | `bool` |
| `tsc_map_clear(m)` | `void` |
| `tsc_map_size(m)` | `double` |
| `tsc_map_keys(m)` | `tsc_array_t*` — array of keys |
| `tsc_map_values(m)` | `tsc_array_t*` — array of values |

### Set

| Symbol | Signature |
|--------|-----------|
| `tsc_set_new(es, kk, cap)` | `tsc_set_t*` |
| `tsc_set_add_raw(s, &v)` | `void` |
| `tsc_set_has_raw(s, &v)` | `bool` |
| `tsc_set_delete_raw(s, &v)` | `bool` |
| `tsc_set_clear(s)` | `void` |
| `tsc_set_size(s)` | `double` |
| `tsc_set_values(s)` | `tsc_array_t*` |
| `tsc_set_union(a, b)` | `tsc_set_t*` — new Set with all elements from both inputs (insertion order preserved). |
| `tsc_set_intersection(a, b)` | `tsc_set_t*` — new Set with elements present in both inputs. |
| `tsc_set_difference(a, b)` | `tsc_set_t*` — new Set with elements of `a` not in `b`. |
| `tsc_set_symmetric_difference(a, b)` | `tsc_set_t*` — new Set with elements present in exactly one of `a` or `b`. |
| `tsc_set_is_subset_of(a, b)` | `bool` — every element of `a` is in `b`. |
| `tsc_set_is_superset_of(a, b)` | `bool` — every element of `b` is in `a`. |
| `tsc_set_is_disjoint_from(a, b)` | `bool` — `a` and `b` share no elements. |

Typed `WeakMap<K, V>` and `WeakSet<T>` reuse these map/set tables with pointer-key kinds and expose only the JavaScript weak-collection methods (`get`/`set`/`has`/`delete` or `add`/`has`/`delete`). There is no iteration API for weak collections.

## Regex (`tsc_regexp_t`)

Wraps PCRE2 8-bit regexes (`<pcre2.h>`) with UTF and Unicode-property support enabled.

```c
typedef struct tsc_regexp {
    pcre2_code* re;
    tsc_str_t* source;
    tsc_str_t* flags;
    bool global, has_indices, ignore_case, multiline, dot_all, sticky, unicode;
    bool compiled;
    uint32_t capture_count;
} tsc_regexp_t;
```

`tsc_regexp_new` compiles JS regex literals through PCRE2. Supported flag properties include `d`, `g`, `i`, `m`, `s`, `u`, and `y`; matching options currently use `i`, `m`, and `s`, while `d`/`y` are exposed as properties without full indices/sticky execution semantics. UTF/UCP mode is enabled so Unicode property escapes such as `\p{L}` and `\p{Script=Greek}` work. PCRE2 also covers lookahead, lookbehind, normal capture groups, and named capture syntax. Named groups are returned by numeric capture position today; a JS-style `.groups` object needs the future dynamic object runtime.

| Symbol | Signature |
|--------|-----------|
| `tsc_regexp_new(pattern, flags)` | `tsc_regexp_t*` |
| `tsc_regexp_exec(re, s)` | `tsc_array_t*` — full match plus capture groups, or `NULL` if none |
| `tsc_regexp_test(re, s)` | `bool` |
| `tsc_str_match_regex(s, re)` | `tsc_array_t*` — array of global match strings, or full match + capture groups for non-global regexes; `NULL` if none |
| `tsc_str_match_all_regex(s, re)` | `tsc_array_t*` — array of per-match capture arrays |
| `tsc_str_search_regex(s, re)` | `double` — byte offset of the first match, or `-1` if none |
| `tsc_str_replace_regex(s, re, repl)` | `tsc_str_t*` — honors the `g` flag and expands JS replacement-string tokens |
| `tsc_str_split_regex(s, re)` | `tsc_array_t*` |
| `tsc_str_split_regex_limit(s, re, limit)` | `tsc_array_t*` |
| `tsc_str_split_regex_limit_num(s, re, limit)` | `tsc_array_t*` |

## Classes

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_instanceof(type_chain, class_name)` | `(const char*, const char*) -> bool` | Runtime ancestry check for emitted class instances. |

## Exceptions (`tsc_try_frame_t`)

Thin `setjmp`/`longjmp` wrapper with a single global "current error" string. No stack traces yet.

```c
typedef struct tsc_try_frame {
    jmp_buf jb;
    struct tsc_try_frame* prev;
} tsc_try_frame_t;
```

| Symbol | Signature | Notes |
|--------|-----------|-------|
| `tsc_try_push(&frame)` | `void` | Push frame onto the try-chain. |
| `tsc_try_pop()` | `void` | Pop after successful try body. |
| `tsc_throw_str(msg)` | `noreturn-ish` | Stores msg, longjmp to top frame. If none, prints `Uncaught:` and exits 1. |
| `tsc_current_error()` | `tsc_str_t*` | Read inside `catch` to get the thrown value. |
| `tsc_rethrow()` | `void` | Re-throw the current error (used for try without catch + finally). |

Generated `try { } catch (e) { }` expands to:

```c
tsc_try_frame_t _eh0;
tsc_try_push(&_eh0);
if (setjmp(_eh0.jb) == 0) {
    /* try body */
    tsc_try_pop();
} else {
    tsc_str_t* e = tsc_current_error();
    /* catch body */
}
```

## Console

| Symbol | Signature |
|--------|-----------|
| `tsc_console_log_n(n, ...)` | `void` — n stringified args, first-arg format substitutions, newline |
| `tsc_console_error_n(n, ...)` | `void` — same but to stderr |

The emitter stringifies each argument to `tsc_str_t*` at the call site, then invokes with the count plus the pointers.

## Process

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_process_exit(code)` | `noreturn` | `process.exit(code)` |
| `tsc_process_argv()` | `tsc_array_t*` | `process.argv` — returns new array each call |
| `tsc_process_env_get(name)` | `tsc_str_t*` | `process.env[name]` — NULL if unset |
| `tsc_process_cwd()` | `tsc_str_t*` | `process.cwd()` |
| `tsc_process_stdio_is_tty(fd)` | `bool` | `process.stdout.isTTY` / `process.stderr.isTTY` |
| `tsc_process_next_tick(fn, env)` / `tsc_process_drain_next_ticks()` | `void` | Bounded before-exit `process.nextTick(callback, ...args)` queue |
| `tsc_queue_microtask(fn, env)` / `tsc_drain_microtasks()` | `void` | Bounded before-exit `queueMicrotask(callback)` queue drained after next ticks |
| `tsc_set_timeout(fn, env)` / `tsc_clear_timeout(id)` / `tsc_drain_timeouts()` | `double` / `void` | Bounded before-exit zero-delay `setTimeout(callback, 0, ...args)` queue drained after next ticks and microtasks, with numeric handles cancellable before drain |
| `tsc_set_immediate(fn, env)` / `tsc_clear_immediate(id)` / `tsc_drain_immediates()` | `double` / `void` | Bounded before-exit `setImmediate(callback, ...args)` queue drained after next ticks, microtasks, and zero-delay timeouts, with numeric handles cancellable before drain |
| `tsc_abort_signal_add_callback(signal, fn, env)` | `void` | Registers a runtime cancellation callback invoked when the bounded AbortSignal aborts; libuv-backed requests use it to reject and cancel pending work |

## child_process (bounded asynchronous spawn subset)

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_child_process_spawn` | `(file, args, cwd, env, shell, argv0, pipeStdin, ignoreStdin, pipeStdout, ignoreStdout, inheritStdout, pipeStderr, ignoreStderr, inheritStderr, detached, uid, gid, killSignal) -> tsc_value_t` | Creates a POSIX child handle, polls nonblocking stdio through the runtime loop, emits stream and lifecycle events, and exposes dynamic `kill` / `ref` / `unref` methods. This bounded subset supports compiler-selected stdio modes, UTF-8 stream opt-in, and string/Buffer stdin writes; broader child-process options and `fork` remain deferred. |

## net (bounded IPv4/IPv6 TCP subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_net_create_server(connection_listener)` | `tsc_value_t` | `net.createServer(connectionListener?)` — creates a timer-polled POSIX IPv4/IPv6 server with dynamic EventEmitter-compatible lifecycle methods, positional or bounded `{ port, host? }` `listen` address-family selection, `close`, `address`, synchronized `listening`, assignment-compatible `maxConnections` admission limits, live `connections` state, and asynchronous `getConnections(callback)` |
| `tsc_net_connect(port, host, connect_listener)` / `tsc_net_connect_options(options, connect_listener)` | `tsc_value_t` | `net.connect` / `net.createConnection` — creates a nonblocking POSIX IPv4/IPv6 socket from positional or bounded `{ port, host? }` options, emits `connect` / `data` / `end` / `close` / `error` / `timeout` / `drain` / `finish`, and exposes UTF-8, string/Buffer write/end callbacks, bounded `writableHighWaterMark` / `writableLength` / `writableNeedDrain` state with queued writes and deferred end completion, half-close, `destroy(error?, callback?)` error-before-close delivery, endpoint metadata, byte counters, `setNoDelay` / `setKeepAlive` controls, chainable idle `setTimeout` scheduling, `pause` / `resume` read gates, lifecycle flags, and IPv4/IPv6 endpoint-family metadata |
| `tsc_net_tls_connect(port, host, reject_unauthorized, servername, connect_listener)` | `tsc_value_t` | Internal HTTPS transport helper — creates a nonblocking POSIX IPv4 socket, negotiates an OpenSSL client session, and emits the underlying socket lifecycle after the TLS handshake |

## http (bounded HTTP/1.1 client/server and validation subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_http_request(options, response_listener)` | `tsc_value_t` | `http.request(options, callback?)` — opens or reuses an endpoint-keyed native TCP connection, buffers ordinary bounded string/Buffer request writes until `end`, preserves individual writes as framed chunks when `Transfer-Encoding: chunked` is selected, propagates bounded 16 KiB `ClientRequest` writable state and `drain` for queued chunked writes, and parses one HTTP/1.1 response with status/version/headers/body metadata including decoded chunks; explicit chunked responses also expose `data` / `end` events; sequential pooling covers ordinary non-chunked requests, while concurrent pooling, chunked keep-alive reuse, broader streaming/backpressure, and `http2` remain deferred |
| `tsc_http_get(options, response_listener)` | `tsc_value_t` | `http.get(options, callback?)` — creates the same bounded client request, reusing an eligible idle endpoint connection, and automatically ends it |
| `tsc_http_create_server(request_listener)` | `tsc_value_t` | `http.createServer(requestListener?)` — creates an HTTP/1.1 server over the native TCP runtime, parsing bounded requests including chunked bodies and exposing request metadata plus response status/header/body methods; explicit chunked response writes flush framed chunks, propagate bounded socket backpressure, expose writable high-water state, and forward `drain`, while explicit `Connection: keep-alive` requests with `Content-Length` bodies may be processed sequentially on one connection; concurrent pooling, chunked keep-alive reuse, and broader streaming/backpressure remain deferred |
| `tsc_http_validate_header_name(name)` | `void` | `http.validateHeaderName(name)` — validates an HTTP token name and throws through the runtime error path on invalid input |
| `tsc_http_validate_header_value(name, value)` | `void` | `http.validateHeaderValue(name, value)` — validates header content and throws through the runtime error path on invalid control characters |

## https (bounded OpenSSL HTTP/1.1 transport subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_https_create_server(options, request_listener)` | `tsc_value_t` | `https.createServer({ key, cert }, requestListener?)` — loads PEM certificate/private-key strings, creates a native nonblocking IPv4 server, negotiates OpenSSL server sessions, and reuses the bounded HTTP/1.1 parser and response lifecycle; general streaming/backpressure and `http2` remain deferred |
| `tsc_https_request(options, response_listener)` | `tsc_value_t` | `https.request(options, callback?)` — opens or reuses an endpoint-keyed TLS client session over the native nonblocking socket runtime, defaults to port 443, supports the bounded HTTP request options plus `rejectUnauthorized` and `servername`, and reuses the HTTP/1.1 request/response parser including bounded chunked request writes and response `data` / `end` events; sequential pooling is limited to ordinary non-chunked requests, while concurrent pooling, chunked keep-alive reuse, general streaming/backpressure, and `http2` remain deferred |
| `tsc_https_get(options, response_listener)` | `tsc_value_t` | `https.get(options, callback?)` — creates the same bounded OpenSSL client request, reusing an eligible idle endpoint session, and automatically ends it |

## fs (sync and bounded async subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_fs_read_file_sync(path)` | `tsc_str_t*` | `fs.readFileSync(path[, utf8OrFlagOptions])` — throws via `tsc_throw_str` on error |
| `tsc_fs_read_file_buffer_sync(path)` | `tsc_buffer_t*` | `fs.readFileSync(path, "buffer" | null | { encoding: "buffer" \| null[, flag] })` |
| `tsc_fs_promises_read_file_async(path, want_buffer, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.readFile(path[, "utf8" \| "buffer" \| null \| { encoding, flag, signal }])` for UTF-8 and Buffer/null results; opens, reads in chunks, closes, then fulfills or rejects the pending Promise, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_read_file_encoded_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.readFile(path, "hex" \| "base64")`; opens, reads in chunks, closes, encodes the bytes, then fulfills or rejects the pending Promise, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_write_file_string_async(path, data, append, exclusive, update, mode, flush, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.writeFile` / `appendFile` for UTF-8 string data and the supported flag/mode combinations; `flush: true` runs `uv_fs_fsync` before close, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_write_file_buffer_async(path, data, append, exclusive, update, mode, flush, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.writeFile` / `appendFile` for Buffer data, including emitter-decoded hex/base64 strings; `flush: true` runs `uv_fs_fsync` before close, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_readdir_async(path, want_buffer, signal)` | `tsc_promise_t*` | Libuv-backed non-recursive `fs.promises.readdir` for UTF-8 string or Buffer filename results; scans asynchronously, rejects on AbortSignal cancellation, asks the active scanner to cancel, and suppresses late fulfillment |
| `tsc_fs_promises_readdir_recursive_async(path, want_buffer, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.readdir` for UTF-8 string or Buffer relative filename results; walks directory entries with sequential `uv_fs_scandir` requests without following symlink entries, rejects on AbortSignal cancellation, and suppresses late fulfillment |
| `tsc_fs_promises_readdir_encoded_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed non-recursive `fs.promises.readdir` for hex/base64 string filename results; scans raw names asynchronously, applies the requested encoding at completion, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_readdir_recursive_encoded_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.readdir` for hex/base64 relative filename results; walks directory entries with sequential `uv_fs_scandir` requests without following symlink entries, applies encoding at completion, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_readdir_dirents_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed non-recursive `fs.promises.readdir(path, { withFileTypes: true })`; scans typed `FSDirent` records asynchronously with `parentPath` and deprecated `path` aliases, applies the requested name encoding, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_readdir_recursive_dirents_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.readdir(path, { recursive: true, withFileTypes: true })`; walks typed directory entries with physical `parentPath`/`path` aliases through sequential `uv_fs_scandir` requests without following symlink entries, applies name encoding, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_opendir_async(path, recursive, encoding, buffer_size, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.opendir(...)` implementation for Promise-chain call sites; opens root and recursive child handles with `uv_fs_opendir`, supports pre-aborted/in-flight root-open cancellation through `signal`, services bounded `Dir.read()` and async-iterator requests with `uv_fs_readdir`, restores parent frames depth-first, and disposes active/parent handles with `uv_fs_closedir`; direct-await call sites retain the POSIX fallback until broader pending-await lowering is available |
| `tsc_fs_promises_access_async(path, mode, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.access(path[, mode])`; performs the access check asynchronously, rejects/cancels on AbortSignal cancellation, and suppresses late fulfillment |
| `tsc_fs_promises_stat_async(path, throw_if_no_entry, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.stat(path)`; fulfills the typed `FSStats` side-channel or, when `throwIfNoEntry` is false, a null side-channel for a missing path, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_lstat_async(path, throw_if_no_entry, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.lstat(path)` with the same missing-entry behavior, without following the final symbolic link, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_statfs_async(path, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.statfs(path)`; fulfills a dynamic object with numeric `bsize`, `frsize`, `blocks`, `bfree`, `bavail`, `files`, and `ffree` fields, rejects/cancels on AbortSignal cancellation, and suppresses late fulfillment |
| `tsc_fs_promises_copy_file_async(src, dest, mode)` | `tsc_promise_t*` | Libuv-backed `fs.promises.copyFile(src, dest, mode?)`; fulfills after the copy completes or rejects with the bounded copy error contract |
| `tsc_fs_promises_cp_async(src, dest, recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps)` | `tsc_promise_t*` | Libuv-backed `fs.promises.cp(src, dest, options)` for the supported recursive and nonrecursive forms; regular files use `uv_fs_copyfile` with destination-existence and optional timestamp requests, directories use sequential scandir/mkdir traversal, and symlinks use asynchronous readlink/realpath/symlink requests |
| `tsc_fs_promises_rename_async(old_path, new_path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.rename(oldPath, newPath)`; fulfills after the rename completes or rejects with the bounded rename error contract |
| `tsc_fs_promises_realpath_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.realpath(path[, options])`; fulfills a UTF-8, encoded-string, or Buffer result after asynchronous resolution, rejects with the bounded realpath error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_readlink_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.readlink(path[, options])`; fulfills a UTF-8, encoded-string, or Buffer target after asynchronous resolution, rejects with the bounded readlink error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_mkdtemp_async(prefix, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.mkdtemp(prefix[, options])`; fulfills a UTF-8, encoded-string, or Buffer directory path after asynchronous creation, rejects with the bounded mkdtemp error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_symlink_async(target, path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.symlink(target, path[, type])`; fulfills after asynchronous link creation or rejects with the bounded symlink error contract |
| `tsc_fs_promises_link_async(existing_path, new_path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.link(existingPath, newPath)`; fulfills after asynchronous hard-link creation or rejects with the bounded link error contract |
| `tsc_fs_promises_utimes_async(path, atime, mtime)` | `tsc_promise_t*` | Libuv-backed `fs.promises.utimes(path, atime, mtime)`; fulfills after asynchronous timestamp update or rejects with the bounded utimes error contract |
| `tsc_fs_promises_lutimes_async(path, atime, mtime)` | `tsc_promise_t*` | Libuv-backed `fs.promises.lutimes(path, atime, mtime)`; fulfills after asynchronous symlink timestamp update or rejects with the bounded lutimes error contract |
| `tsc_fs_promises_chmod_async(path, mode)` | `tsc_promise_t*` | Libuv-backed `fs.promises.chmod(path, mode)`; fulfills after asynchronous mode update or rejects with the bounded chmod error contract |
| `tsc_fs_promises_chown_async(path, uid, gid)` | `tsc_promise_t*` | Libuv-backed `fs.promises.chown(path, uid, gid)`; fulfills after asynchronous ownership update or rejects with the bounded chown error contract |
| `tsc_fs_promises_lchown_async(path, uid, gid)` | `tsc_promise_t*` | Libuv-backed `fs.promises.lchown(path, uid, gid)`; fulfills after asynchronous symlink ownership update or rejects with the bounded lchown error contract |
| `tsc_fs_promises_mkdir_async(path, mode, signal)` | `tsc_promise_t*` | Libuv-backed nonrecursive `fs.promises.mkdir(path[, mode])`; fulfills after asynchronous directory creation, rejects with the bounded mkdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_mkdir_recursive_async(path, mode, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.mkdir(path, { recursive: true, mode })`; walks path prefixes with sequential `uv_fs_mkdir` requests, accepts existing components, rejects with the bounded recursive mkdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_unlink_async(path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.unlink(path)`; fulfills after asynchronous file removal or rejects with the bounded unlink error contract |
| `tsc_fs_promises_rmdir_async(path, signal)` | `tsc_promise_t*` | Libuv-backed nonrecursive `fs.promises.rmdir(path)`; fulfills after asynchronous empty-directory removal, rejects with the bounded rmdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_rmdir_recursive_async(path, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.rmdir(path, { recursive: true })`; walks directories with sequential lstat/scandir/unlink/rmdir requests, rejects a non-directory root or with the bounded rmdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_rm_async(path, force, signal)` | `tsc_promise_t*` | Libuv-backed nonrecursive `fs.promises.rm(path[, { force }])`; fulfills after asynchronous file/symlink removal, resolves a missing path when `force` is true, rejects with the bounded rm error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_rm_recursive_async(path, force, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.rm(path[, { recursive, force }])`; walks directories with sequential lstat/scandir/unlink/rmdir requests, resolves missing paths when `force` is true, rejects with the bounded rm error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_truncate_async(path, len)` | `tsc_promise_t*` | Libuv-backed `fs.promises.truncate(path, len?)` open/ftruncate/close request; fulfills after asynchronous truncation or rejects with the bounded truncate error contract |
| `tsc_fs_write_file_sync(path, data)` / `tsc_fs_write_file_sync_opts(_mode)(path, data, append, exclusive[, mode])` | `void` | `fs.writeFileSync(path, data[, utf8OrFlagOrModeOptions])` |
| `tsc_fs_append_file_sync(path, data)` / `tsc_fs_write_file_sync_opts(_mode)(path, data, true, exclusive[, mode])` | `void` | `fs.appendFileSync(path, data[, utf8OrAppendFlagOrModeOptions])` |
| `tsc_fs_exists_sync(path)` | `bool` | `fs.existsSync(path)` |
| `tsc_fs_readdir_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path)` — array of filenames |
| `tsc_fs_opendir_sync(path, recursive, encoding, buffer_size)` | `tsc_value_t` | `fs.opendirSync(path[, { recursive, encoding, bufferSize }])` — bounded POSIX directory handle with per-frame prefetch capped by `buffer_size`, sync/Promise reads returning Dirent `parentPath`/deprecated `path` aliases, depth-first recursive traversal, UTF-8/hex/base64/Buffer names, async-iterator methods, and idempotent sync/async disposal; the emitter accepts literal/const buffer sizes from 1 through 4,294,967,295 and defaults to 32 |
| `tsc_fs_readdir_buffer_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, "buffer" \| { encoding: "buffer" })` — array of Buffer filenames |
| `tsc_fs_readdir_recursive_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, { recursive: true })` — recursive relative filename strings |
| `tsc_fs_readdir_recursive_buffer_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, { recursive: true, encoding: "buffer" })` — recursive relative Buffer filenames |
| `tsc_fs_readdir_encode_names(entries, encoding)` | `tsc_array_t*` | Applies hex/base64 string encoding to each filename in a readdir string array |
| `tsc_fs_readdir_dirents_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, { withFileTypes: true })` — array of bounded `Dirent` records with `parentPath` and deprecated `path` aliases |
| `tsc_fs_stat_sync(path)` | `tsc_fs_stats_t*` | `fs.statSync(path)` — small `Stats` subset |
| `tsc_fs_lstat_sync(path)` | `tsc_fs_stats_t*` | `fs.lstatSync(path)` — small `Stats` subset without following symlinks |
| `tsc_fs_statfs_sync(path)` | `tsc_value_t` | `fs.statfsSync(path)` — bounded numeric filesystem-stat object |
| `tsc_fs_realpath_sync(path)` | `tsc_str_t*` | `fs.realpathSync(path[, "utf8" \| "buffer" \| { encoding }])` |
| `tsc_fs_readlink_sync(path)` | `tsc_str_t*` | `fs.readlinkSync(path[, "utf8" \| "buffer" \| { encoding }])` |
| `tsc_fs_symlink_sync(target, path)` | `void` | `fs.symlinkSync(target, path)` |
| `tsc_fs_link_sync(existingPath, newPath)` | `void` | `fs.linkSync(existingPath, newPath)` |
| `tsc_fs_mkdtemp_sync(prefix)` | `tsc_str_t*` | `fs.mkdtempSync(prefix[, "utf8" \| "buffer" \| { encoding }])`; explicit Buffer encodings wrap the string result with `tsc_buffer_from_str` |
| `tsc_fs_truncate_sync(path, len)` | `void` | `fs.truncateSync(path, len?)` |
| `tsc_fs_utimes_sync(path, atime, mtime)` | `void` | `fs.utimesSync(path, atime, mtime)` |
| `tsc_fs_lutimes_sync(path, atime, mtime)` | `void` | `fs.lutimesSync(path, atime, mtime)` |
| `tsc_fs_chown_sync(path, uid, gid)` | `void` | `fs.chownSync(path, uid, gid)` |
| `tsc_fs_lchown_sync(path, uid, gid)` | `void` | `fs.lchownSync(path, uid, gid)` |
| `tsc_fs_stats_dev(st)` / `tsc_fs_stats_ino(st)` | `double` | `Stats.dev` / `Stats.ino` |
| `tsc_fs_stats_size(st)` / `tsc_fs_stats_mode(st)` | `double` | `Stats.size` / `Stats.mode` |
| `tsc_fs_stats_nlink(st)` / `uid` / `gid` / `rdev` / `blksize` / `blocks` | `double` | `Stats.nlink` / `uid` / `gid` / `rdev` / `blksize` / `blocks` |
| `tsc_fs_stats_atime_ms(st)` | `double` | `Stats.atimeMs` |
| `tsc_fs_stats_mtime_ms(st)` | `double` | `Stats.mtimeMs` |
| `tsc_fs_stats_ctime_ms(st)` | `double` | `Stats.ctimeMs` |
| `tsc_fs_stats_birthtime_ms(st)` | `double` | `Stats.birthtimeMs` |
| `tsc_fs_stats_is_file(st)` | `bool` | `Stats.isFile()` |
| `tsc_fs_stats_is_directory(st)` | `bool` | `Stats.isDirectory()` |
| `tsc_fs_stats_is_symbolic_link(st)` | `bool` | `Stats.isSymbolicLink()` |
| `tsc_fs_access_sync(path)` | `void` | `fs.accessSync(path)` with the default `F_OK` mode; throws via `tsc_throw_str` when the path is not accessible |
| `tsc_fs_chmod_sync(path, mode)` | `void` | `fs.chmodSync(path, mode)` |
| `tsc_fs_mkdir_sync(path)` | `void` | `fs.mkdirSync(path)` |
| `tsc_fs_mkdir_sync_opts(path, recursive, mode)` | `void` | `fs.mkdirSync(path, mode \| { recursive, mode })` bounded options subset |
| `tsc_fs_unlink_sync(path)` | `void` | `fs.unlinkSync(path)` |
| `tsc_fs_rm_sync(path)` | `void` | `fs.rmSync(path)` |
| `tsc_fs_rm_sync_opts(path, recursive, force)` | `void` | `fs.rmSync(path, { recursive, force })` |
| `tsc_fs_rmdir_sync(path)` | `void` | `fs.rmdirSync(path)` |
| `tsc_fs_rmdir_sync_opts(path, recursive)` | `void` | `fs.rmdirSync(path, { recursive })` |
| `tsc_fs_cp_sync_opts(src, dest, recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps)` | `void` | `fs.cpSync(src, dest, { recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps })` |
| `tsc_fs_copy_file_sync(src, dest)` | `void` | `fs.copyFileSync(src, dest)` |
| `tsc_fs_rename_sync(oldPath, newPath)` | `void` | `fs.renameSync(oldPath, newPath)` |

`fs.promises.readFile` uses a libuv-backed open/read/close chain for default UTF-8, hex/base64, and explicit Buffer/null results; encoded strings are produced after the asynchronous byte read completes. Its supported AbortSignal path rejects queued/in-flight reads and requests cancellation of the active libuv request, closing an already-open descriptor without allowing a later completion to fulfill the Promise. `fs.promises.writeFile` and `appendFile` use libuv-backed open/write/close chains for the supported string/Buffer data, encoding, flag, exclusive, update, and mode combinations; their supported AbortSignal path rejects queued/in-flight writes, requests cancellation of the active libuv request, closes an already-open descriptor, and suppresses late fulfillment. Non-recursive and recursive UTF-8/Buffer, hex/base64, and `withFileTypes` `fs.promises.readdir` calls use libuv-backed scanners; their supported AbortSignal path rejects queued/in-flight scans, requests cancellation of the active scanner, and suppresses late fulfillment. The libuv-backed `fs.promises.stat` / `lstat` and `fs.promises.realpath` / `readlink` / `mkdtemp` requests also reject queued/in-flight work, request cancellation of the active request, and suppress late fulfillment on AbortSignal cancellation. Signal-bearing nonrecursive/recursive `fs.promises.mkdir` and `fs.promises.rm` / `rmdir` state machines likewise reject queued/in-flight work, request cancellation of the active request, and suppress late fulfillment. Default/mode `fs.promises.access` calls, `fs.promises.statfs`, `fs.promises.symlink` / `link`, `fs.promises.truncate`, `fs.promises.utimes` / `lutimes` / `chmod` / `chown` / `lchown`, `fs.promises.unlink`, `fs.promises.copyFile` / `rename`, and all supported recursive/nonrecursive `fs.promises.cp` option forms use libuv-backed requests or state machines; recursive `readdir` walks directory entries sequentially without following symlink entries, recursive `mkdir` walks path prefixes sequentially, recursive `cp` walks directories sequentially, copies regular files with `uv_fs_copyfile`, and recreates symlinks through asynchronous link-target requests. Recursive `rmdir` rejects non-directory roots. Stat/lstat, the libuv Buffer-returning read, and the libuv string/Dirent-returning readdir paths use typed promise side-channel records. Broader AbortSignal semantics and broader libuv-backed filesystem I/O remain deferred.

The bounded AbortSignal contract also covers libuv-backed `fs.promises.access(path[, { signal }])` and `statfs(path[, { bigint, signal }])`: queued requests reject with the signal reason, active requests are asked to cancel, and late fulfillment is suppressed.

Supported fs path arguments use a bounded `PathLike` subset: strings pass through directly, Buffer paths are coerced to UTF-8 strings, and `file:` URL objects are resolved to their filesystem pathname before calling the same runtime helpers. Non-file URLs are rejected at runtime.

## path

| Symbol | Signature |
|--------|-----------|
| `tsc_path_join(n, ...)` | `tsc_str_t*` — variadic |
| `tsc_path_resolve(n, ...)` | `tsc_str_t*` — variadic, absolute |
| `tsc_path_normalize(p)` | `tsc_str_t*` — bounded POSIX segment cleanup |
| `tsc_path_is_absolute(p)` | `bool` — leading-slash absolute check |
| `tsc_path_relative(from, to)` | `tsc_str_t*` — bounded POSIX relative path construction |
| `tsc_path_basename(p)` | `tsc_str_t*` |
| `tsc_path_dirname(p)` | `tsc_str_t*` |
| `tsc_path_extname(p)` | `tsc_str_t*` |

## os

| Symbol | Returns |
|--------|---------|
| `tsc_os_platform()` | `tsc_str_t*` — `"linux"`, `"darwin"`, `"win32"`, or `"unknown"` |
| `tsc_os_arch()` | `tsc_str_t*` — `"x64"`, `"arm64"`, `"ia32"`, `"arm"`, `"unknown"` |
| `tsc_os_hostname()` | `tsc_str_t*` |
| `tsc_os_tmpdir()` | `tsc_str_t*` — `$TMPDIR` or `/tmp` |
| `tsc_os_homedir()` | `tsc_str_t*` — `$HOME` or `/` |
| `tsc_os_cpu_count()` | `double` — from `sysconf(_SC_NPROCESSORS_ONLN)` |
| `tsc_date_now()` | `double` — ms since epoch via `clock_gettime(CLOCK_REALTIME)` |
| `tsc_date_local(year, month, day, hours, minutes, seconds, ms)` | `double` — local-time `new Date(year, month, ...)` epoch milliseconds |
| `tsc_date_set_local_part(date, part, a, b, c, e, arg_count)` | `double` — local-time Date setter helper with normalized overflow |
| `tsc_date_get_utc_part(date, part)` | `double` — UTC year/month/date/day/hour/minute/second/ms component |
| `tsc_date_get_local_part(date, part)` | `double` — local year/month/date/day/hour/minute/second/ms component |
| `tsc_date_get_timezone_offset(date)` | `double` — JavaScript `Date#getTimezoneOffset()` minutes |

## crypto

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_crypto_create_hash(algorithm)` | `tsc_hash_t*` | `crypto.createHash("sha256")` |
| `tsc_crypto_get_hashes()` | `tsc_array_t*` | `crypto.getHashes()` |
| `tsc_hash_update(hash, data)` | `tsc_hash_t*` | `.update(data)` |
| `tsc_hash_digest(hash, encoding)` | `tsc_str_t*` | `.digest("hex")` |

## EventEmitter

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_event_emitter_new()` | `tsc_event_emitter_t*` | `new EventEmitter()` |
| `tsc_event_emitter_on(ee, event, fn, env, identity, once, prepend)` | `void` | `on` / `addListener` / `prependListener` / `once` / `prependOnceListener`; `fn` is a generated adapter and `identity` preserves listener removal semantics |
| `tsc_event_emitter_off(ee, event, fn, identity)` | `void` | `off` / `removeListener` |
| `tsc_event_emitter_remove_all(ee, event)` | `void` | `removeAllListeners(event?)` |
| `tsc_event_emitter_emit(ee, event, args)` | `bool` | `emit(event, ...args)`; `args` is a boxed `tsc_value_t` array; unhandled `"error"` emits throw |
| `tsc_event_emitter_once_promise(ee, event, signal)` | `tsc_promise_t*` | `events.once(ee, event, { signal })`; settles on the event/error or rejects on AbortSignal cancellation |
| `tsc_timers_promises_set_interval(value, delay, signal)` | `tsc_value_t` | `timers/promises.setInterval(delay, value, { signal })`; returns a bounded async iterator with interval ticks, iterator close, and AbortSignal cancellation |
| `tsc_event_emitter_on_async_iterator(ee, event, signal, close_events, high_water_mark, low_water_mark)` | `tsc_value_t` | `events.on(ee, event, { signal, close, highWaterMark, lowWaterMark })`; returns a dynamic queued/pending async iterator with bounded pause/resume backpressure |
| `tsc_event_emitter_listener_count(ee, event)` | `double` | `listenerCount(event)` |
| `tsc_event_emitter_listener_count_identity(ee, event, identity)` | `double` | `listenerCount(event, listener)` filtered by preserved listener identity |
| `tsc_event_emitter_event_names(ee)` | `tsc_array_t*` | `eventNames()` as a string array |
| `tsc_event_emitter_pause(ee)` / `tsc_event_emitter_resume(ee)` | `void` | pause/resume state used by `events.on` watermark backpressure |
| `tsc_event_emitter_is_paused(ee)` | `bool` | `isPaused()` for the bounded pauseable emitter subset |
| `tsc_event_emitter_set_max_listeners(ee, n)` | `void` | `setMaxListeners(n)`; stores the configured count but does not emit warnings yet |
| `tsc_event_emitter_get_max_listeners(ee)` | `double` | `getMaxListeners()` |

## Event / EventTarget

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_event_new(type, cancelable)` | `tsc_event_t*` | `new Event(type, { cancelable })` |
| `tsc_event_type(event)` | `tsc_str_t*` | `event.type` |
| `tsc_event_target(event)` | `tsc_event_target_t*` | `event.target` |
| `tsc_event_current_target(event)` | `tsc_event_target_t*` | `event.currentTarget` |
| `tsc_event_default_prevented(event)` | `bool` | `event.defaultPrevented` |
| `tsc_event_cancelable(event)` | `bool` | `event.cancelable` |
| `tsc_event_prevent_default(event)` | `void` | `event.preventDefault()` |
| `tsc_event_target_new()` | `tsc_event_target_t*` | `new EventTarget()` |
| `tsc_event_target_add(target, type, fn, env, identity, once)` | `void` | `addEventListener(type, listener[, options])` with generated typed-listener adapters, identity-based duplicate suppression, and bounded `{ once: true }` support |
| `tsc_event_target_remove(target, type, fn, identity)` | `void` | `removeEventListener(type, listener)` |
| `tsc_event_target_dispatch(target, event)` | `bool` | `dispatchEvent(event)` synchronous same-target dispatch; returns false for cancelable default-prevented events |

## URL

`tsc_url_t` stores the parsed fields exposed by `URL` instances: `href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, and `origin`.

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_url_new(input)` | `tsc_url_t*` | `new URL(input)` for absolute URLs with `//` authority |

## Buffer

`tsc_buffer_t` is a byte vector with explicit length. It is binary-safe; UTF-8 conversion is only applied by `toString("utf8")`/string coercion.

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_buffer_from_str(input, encoding)` | `tsc_buffer_t*` | `Buffer.from(string, "utf8" | "hex")` |
| `tsc_buffer_from_array(input)` | `tsc_buffer_t*` | `Buffer.from(number[])` |
| `tsc_buffer_alloc(size, fill)` | `tsc_buffer_t*` | `Buffer.alloc(size, fill)` |
| `tsc_buffer_concat(list)` | `tsc_buffer_t*` | `Buffer.concat(Buffer[])` |
| `tsc_buffer_to_string(buffer, encoding)` | `tsc_str_t*` | `.toString("utf8" | "hex")` |
| `tsc_buffer_slice(buffer, start, end)` | `tsc_buffer_t*` | `.slice()` / `.subarray()` |
| `tsc_buffer_equals(a, b)` | `bool` | `.equals(other)` |
| `tsc_buffer_length(buffer)` | `double` | `.length` |
| `tsc_buffer_get(buffer, idx)` | `double` | `buffer[idx]` |

## JSON helpers

| Symbol | Purpose |
|--------|---------|
| `tsc_json_escape_string(s)` | Returns `s` wrapped in `"..."` with JSON escape sequences. |
| `tsc_json_num(n)` | Number formatted for JSON. `NaN` / `±Infinity` → `"null"` per spec. |

`JSON.stringify` itself is not a runtime function — it's expanded at emit time by walking the TS type and emitting the right nested helpers. See `stringifyJsonValue` in `src/emit/index.ts`.

## Memory-management macros

```c
#define TSC_GC_MALLOC(n)         GC_MALLOC(n)        /* or calloc under -DTSC_NO_GC */
#define TSC_GC_MALLOC_ATOMIC(n)  GC_MALLOC_ATOMIC(n) /* raw bytes, no scan */
#define TSC_GC_REALLOC(p, n)     GC_REALLOC((p), (n))
#define TSC_GC_INIT()            GC_INIT()
```

The `-DTSC_NO_GC` define in `src/link/cc.ts` switches all of these to `calloc`/`realloc`/`ε`. This is what `--no-gc` does at the CLI.

## Embedded Node Bridge

The embedded Node bridge is linked only when `--unsafe-eval` or manifest-allowed native addons require it. First-class global `eval` and `Function` value references lower to generic function wrappers that route through this bridge; they remain rejected unless `--unsafe-eval` is enabled.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_node_eval` | `(tsc_str_t*) -> tsc_value_t` | Dynamic `eval(...)` execution through V8, gated by `TSC_UNSAFE_EVAL`. |
| `tsc_node_function` | `(tsc_str_t*) -> tsc_value_t` | Dynamic `Function(...)` body compilation through V8, gated by `TSC_UNSAFE_EVAL`. |
| `tsc_node_native_addon` | `(tsc_str_t*) -> tsc_value_t` | Manifest-backed native addon load through the embedded Node `require` hook. Does not require `TSC_UNSAFE_EVAL`. |
| `tsc_builtin_eval` | `(void*, tsc_value_t, tsc_array_t*) -> tsc_value_t` | Generic function wrapper for first-class global `eval` references. |
| `tsc_builtin_function` | `(void*, tsc_value_t, tsc_array_t*) -> tsc_value_t` | Generic function wrapper for first-class global `Function` references. |

## Adding a new runtime function

1. Declare in `runtime/tsc_runtime.h` under an appropriate section.
2. Implement in `runtime/tsc_runtime.c`.
3. Teach the emitter to call it — typically by adding a `case` inside `emitArrayMethod`, `emitStringMethod`, `emitMathCall`, or similar dispatchers in `src/emit/index.ts`.
4. If it exposes a new TS API, also add the TS declaration in `stdlib/lib.core.d.ts` so the type checker accepts user code using it.
5. Add an e2e case under `tests/e2e/cases/<feature>/` — see [`testing.md`](testing.md).
