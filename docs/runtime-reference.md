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
| `tsc_str_from_bool` | `(bool) -> tsc_str_t*` | `"true"` / `"false"`. |
| `tsc_str_from_char_code_n` | `(size_t n, ...) -> tsc_str_t*` | `String.fromCharCode(...)`, encoding UTF-16 code units as UTF-8. |

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
| `tsc_str_code_point_at(s, i)` | `double` | `.codePointAt(i)`, using JS UTF-16 indices |
| `tsc_str_index_of(h, n)` | `double` | `.indexOf(n)` (-1 if missing) |
| `tsc_str_includes(h, n)` | `bool` | `.includes(n)` |
| `tsc_str_starts_with(s, p)` | `bool` | `.startsWith(p)` |
| `tsc_str_ends_with(s, p)` | `bool` | `.endsWith(p)` |
| `tsc_str_slice(s, start, end)` | `tsc_str_t*` | `.slice(start, end)`, negative indices OK |
| `tsc_str_substring(s, start, end)` | `tsc_str_t*` | `.substring(start, end)`, clamp/swap semantics |
| `tsc_str_to_upper` | `tsc_str_t*` | `.toUpperCase()` (ASCII only) |
| `tsc_str_to_lower` | `tsc_str_t*` | `.toLowerCase()` (ASCII only) |
| `tsc_str_normalize(s, form)` | `tsc_str_t*` | `.normalize(form)`, ICU-backed NFC/NFD/NFKC/NFKD |
| `tsc_str_trim` | `tsc_str_t*` | `.trim()` |
| `tsc_str_trim_start` | `tsc_str_t*` | `.trimStart()` |
| `tsc_str_trim_end` | `tsc_str_t*` | `.trimEnd()` |
| `tsc_str_repeat(s, n)` | `tsc_str_t*` | `.repeat(n)` |
| `tsc_str_pad_start(s, len, pad)` | `tsc_str_t*` | `.padStart(len, pad)` |
| `tsc_str_pad_end(s, len, pad)` | `tsc_str_t*` | `.padEnd(len, pad)` |
| `tsc_str_replace(s, needle, repl)` | `tsc_str_t*` | `.replace("a", "b")` (first match) |
| `tsc_str_replace_all(s, needle, repl)` | `tsc_str_t*` | `.replaceAll("a", "b")` (all matches) |
| `tsc_str_concat(a, b)` | `tsc_str_t*` | `a + b` and `.concat(...)` |
| `tsc_str_split(s, sep)` | `tsc_array_t*` | `.split("a")` → array of strings |
| `tsc_str_chars(s)` | `tsc_array_t*` | string `for...of` values, one UTF-8 code point per string |

## Numbers

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_num_mod` | `(double, double) -> double` | `fmod` — JS-style modulo for the `%` operator. |
| `tsc_parse_float` | `(const tsc_str_t*) -> double` | Equivalent of `parseFloat`. Returns NaN on failure. |
| `tsc_parse_int` | `(const tsc_str_t*, double radix) -> double` | Equivalent of `parseInt`. |
| `tsc_math_random` | `() -> double` | `Math.random()`, range [0, 1). Uses `rand()`. |

## Arrays (`tsc_array_t`)

Type-erased dynamic vector. Element size + kind known only to the emitter — the emitter generates the right access via the `TSC_ARR(T, arr, i)` macro.

```c
typedef struct tsc_array {
    size_t len, cap, es;  // element size in bytes
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
| `TSC_ARR(T, arr, i)` | lvalue | Macro for typed element access — `((T*)arr->data)[(size_t)i]`. |
| `tsc_array_oob(arr, i)` | `void` | Placeholder bounds-check hook (silent today, planned to throw `RangeError`). |

High-order methods like `.map`/`.filter`/`.reduce` are **not** runtime functions — they're expanded inline in the emitter (`emitArrayHof` in `src/emit/index.ts`).

`Object.entries` uses `tsc_object_entry_t` elements inside a normal `tsc_array_t`. The struct stores the string key plus one typed value slot (`num`, `boolean`, or `ptr`) chosen by the emitter for the homogeneous object field type.

## Dynamic Values (`tsc_value_t`)

NaN-boxed `uint64_t` used for `any`, `unknown`, heterogeneous unions, dynamic JSON results, and heterogeneous dynamic arrays/objects.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_value_num/bool/string/array/object(...)` | `tsc_value_t` | Box specialized values into the dynamic representation |
| `tsc_value_null()` / `tsc_value_undefined()` | `tsc_value_t` | Dynamic nullish sentinels |
| `tsc_value_as_num/bool/string/array(v)` | varies | Unbox dynamic values after TypeScript narrowing, typed assignment/call coercion, or runtime coercion |
| `tsc_value_to_string(v)` | `tsc_str_t*` | JS-like string conversion for console/template coercion |
| `tsc_value_typeof(v)` | `tsc_str_t*` | Runtime `typeof` result for dynamic values |
| `tsc_value_is_truthy(v)` | `bool` | JS truthiness for dynamic values |
| `tsc_value_is_nullish(v)` | `bool` | Dynamic `??` null/undefined test |
| `tsc_value_is_array(v)` | `bool` | Runtime check used by dynamic `Array.isArray` |
| `tsc_value_add/sub/mul/div/mod/pow(a, b)` | `tsc_value_t` | Dynamic arithmetic and `+` string concatenation |
| `tsc_value_eq(a, b)` | `bool` | Dynamic equality for numbers, booleans, strings, nullish sentinels, and object identity |
| `tsc_value_object_is(a, b)` | `bool` | SameValue comparison used by `Object.is`, including `NaN` and signed-zero handling |
| `tsc_value_cmp(a, b)` | `int` | Dynamic relational comparison; returns `2` for unordered/NaN comparisons |
| `tsc_value_method_*(recv, ...)` | `tsc_value_t` | Runtime dispatch for common dynamic string/array methods such as `includes`, `indexOf`, `lastIndexOf`, `localeCompare`, `normalize`, `padStart`, `padEnd`, `repeat`, `replace`, `replaceAll`, `slice`, `split`, `substring`, `trimStart`, `trimEnd`, `join`, `push`, `pop`, `shift`, `unshift`, `at`, `concat`, `copyWithin`, `fill`, `flat`, `sort`, `splice`, `toReversed`, `toSorted`, `toSpliced`, `with`, and casing/trim helpers |
| `tsc_value_json_stringify(v)` | `tsc_str_t*` | Recursive dynamic JSON stringify |
| `tsc_value_get_prop(v, key)` | `tsc_value_t` | Dynamic object property read through the prototype chain, returning `undefined` when absent |
| `tsc_value_get_index(v, index)` | `tsc_value_t` | Dynamic array index read, returning `undefined` when absent |
| `tsc_value_set_index(v, index, value)` | `bool` | Dynamic array index write, extending with `undefined` for skipped slots |
| `tsc_value_set_prop(v, key, value)` | `bool` | Dynamic object data/accessor-property write used by `Reflect.set(...)` and direct dynamic property assignment |
| `tsc_value_define_property_desc(v, key, value, writable, enumerable, configurable)` | `bool` | Dynamic data descriptor definition used by `Object.defineProperty` / `Reflect.defineProperty` |
| `tsc_value_define_accessor_desc(v, key, getter, setter, enumerable, configurable)` | `bool` | Dynamic named-function accessor descriptor definition used by `Object.defineProperty` / `Reflect.defineProperty` |
| `tsc_value_object_create(proto)` | `tsc_value_t` | Dynamic object allocation with an object/null prototype |
| `tsc_value_is_prototype_of(proto, object)` | `bool` | Dynamic `Object.prototype.isPrototypeOf` prototype-chain query |
| `tsc_value_get/set_prototype_of(v, proto)` | `tsc_value_t` / `bool` | Dynamic `Object`/`Reflect` prototype access and mutation |
| `tsc_value_has_prop(v, key)` | `bool` | Dynamic property existence through the prototype chain |
| `tsc_value_has_own_prop(v, key)` | `bool` | Own-property existence used by `Object.hasOwn` and `Object.prototype.hasOwnProperty` |
| `tsc_value_property_is_enumerable(v, key)` | `bool` | Own enumerable-property check used by `Object.prototype.propertyIsEnumerable` |
| `tsc_value_delete_prop(v, key)` | `bool` | Own-property descriptor-aware deletion |
| `tsc_value_is_extensible/prevent_extensions(v)` | `bool` | Dynamic object extensibility state used by `Object` / `Reflect` APIs |
| `tsc_value_seal/freeze/is_sealed/is_frozen(v)` | `bool` | Dynamic seal/freeze state and descriptor flag enforcement |
| `tsc_value_own_keys(v)` | `tsc_array_t*` | Reflect-style own string keys including non-enumerable properties |
| `tsc_value_get_own_property_descriptor(v, key)` | `tsc_value_t` | Dynamic data/accessor descriptor object or `undefined` |
| `tsc_value_get_own_property_descriptors(v)` | `tsc_value_t` | Dynamic object containing descriptor objects for all own dynamic properties |
| `tsc_value_object_assign(target, source)` | `tsc_value_t` | Dynamic enumerable-property copy used by `Object.assign`, invoking source getters |
| `tsc_value_length(v)` | `double` | `.length` for dynamic arrays/strings |
| `tsc_object_new/set/define/define_accessor/get(...)` | varies | Runtime backing store for dynamic objects, data descriptors, and named-function accessor descriptors |
| `tsc_value_object_keys/values(v)` | `tsc_array_t*` | Enumerable `Object.keys` / `Object.values` for dynamic objects |
| `tsc_value_object_entries(v)` | `tsc_array_t*` | Enumerable `Object.entries` for dynamic objects, returning dynamic `[key, value]` arrays |
| `tsc_value_object_from_entries(entries)` | `tsc_value_t` | Dynamic `Object.fromEntries`, accepting dynamic arrays of dynamic `[key, value]` pairs |
| `tsc_json_parse(text)` | `tsc_value_t` | Recursive JSON parser for objects, arrays, strings, numbers, booleans, and null |

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
| `tsc_symbol_description(sym)` | `tsc_str_t*` | `.description`, `NULL` when absent |
| `tsc_symbol_to_string(sym)` | `tsc_str_t*` | `.toString()` / console stringification |

## WeakRef (`tsc_weakref_t`)

Typed weak-reference wrappers store a target pointer and return it from `.deref()`. `FinalizationRegistry` is not part of this surface yet.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_weakref_new(target)` | `tsc_weakref_t*` | `new WeakRef(target)` |
| `tsc_weakref_deref(ref)` | `void*` | `.deref()`, cast back to the typed target by the emitter |

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

Typed `WeakMap<K, V>` and `WeakSet<T>` reuse these map/set tables with pointer-key kinds and expose only the JavaScript weak-collection methods (`get`/`set`/`has`/`delete` or `add`/`has`/`delete`). There is no iteration API for weak collections.

## Regex (`tsc_regexp_t`)

Wraps PCRE2 8-bit regexes (`<pcre2.h>`) with UTF and Unicode-property support enabled.

```c
typedef struct tsc_regexp {
    pcre2_code* re;
    tsc_str_t* source;
    tsc_str_t* flags;
    bool global, ignore_case, multiline, dot_all, unicode;
    bool compiled;
    uint32_t capture_count;
} tsc_regexp_t;
```

`tsc_regexp_new` compiles JS regex literals through PCRE2. Supported flags include `g`, `i`, `m`, `s`, and `u`; UTF/UCP mode is enabled so Unicode property escapes such as `\p{L}` and `\p{Script=Greek}` work. PCRE2 also covers lookahead, lookbehind, normal capture groups, and named capture syntax. Named groups are returned by numeric capture position today; a JS-style `.groups` object needs the future dynamic object runtime.

| Symbol | Signature |
|--------|-----------|
| `tsc_regexp_new(pattern, flags)` | `tsc_regexp_t*` |
| `tsc_regexp_test(re, s)` | `bool` |
| `tsc_str_match_regex(s, re)` | `tsc_array_t*` — array of global match strings, or full match + capture groups for non-global regexes; `NULL` if none |
| `tsc_str_match_all_regex(s, re)` | `tsc_array_t*` — array of per-match capture arrays |
| `tsc_str_replace_regex(s, re, repl)` | `tsc_str_t*` — honors the `g` flag |
| `tsc_str_split_regex(s, re)` | `tsc_array_t*` |

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

## fs (sync subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_fs_read_file_sync(path)` | `tsc_str_t*` | `fs.readFileSync(path)` — throws via `tsc_throw_str` on error |
| `tsc_fs_write_file_sync(path, data)` | `void` | `fs.writeFileSync(path, data)` |
| `tsc_fs_exists_sync(path)` | `bool` | `fs.existsSync(path)` |
| `tsc_fs_readdir_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path)` — array of filenames |

## path

| Symbol | Signature |
|--------|-----------|
| `tsc_path_join(n, ...)` | `tsc_str_t*` — variadic |
| `tsc_path_resolve(n, ...)` | `tsc_str_t*` — variadic, absolute |
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

## crypto

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_crypto_create_hash(algorithm)` | `tsc_hash_t*` | `crypto.createHash("sha256")` |
| `tsc_hash_update(hash, data)` | `tsc_hash_t*` | `.update(data)` |
| `tsc_hash_digest(hash, encoding)` | `tsc_str_t*` | `.digest("hex")` |

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

## Adding a new runtime function

1. Declare in `runtime/tsc_runtime.h` under an appropriate section.
2. Implement in `runtime/tsc_runtime.c`.
3. Teach the emitter to call it — typically by adding a `case` inside `emitArrayMethod`, `emitStringMethod`, `emitMathCall`, or similar dispatchers in `src/emit/index.ts`.
4. If it exposes a new TS API, also add the TS declaration in `stdlib/lib.core.d.ts` so the type checker accepts user code using it.
5. Add an e2e case under `tests/e2e/cases/<feature>/` — see [`testing.md`](testing.md).
