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

### Equality and comparison

| Symbol | Signature |
|--------|-----------|
| `tsc_str_eq` | `(const tsc_str_t*, const tsc_str_t*) -> bool` |
| `tsc_str_cmp` | `(const tsc_str_t*, const tsc_str_t*) -> int` (strcmp-style) |

### Methods (match JS `String.prototype`)

| Symbol | Returns | JS equivalent |
|--------|---------|---------------|
| `tsc_str_length` | `double` | `.length` |
| `tsc_str_char_at(s, i)` | `tsc_str_t*` | `.charAt(i)` |
| `tsc_str_index_of(h, n)` | `double` | `.indexOf(n)` (-1 if missing) |
| `tsc_str_includes(h, n)` | `bool` | `.includes(n)` |
| `tsc_str_starts_with(s, p)` | `bool` | `.startsWith(p)` |
| `tsc_str_ends_with(s, p)` | `bool` | `.endsWith(p)` |
| `tsc_str_slice(s, start, end)` | `tsc_str_t*` | `.slice(start, end)`, negative indices OK |
| `tsc_str_to_upper` | `tsc_str_t*` | `.toUpperCase()` (ASCII only) |
| `tsc_str_to_lower` | `tsc_str_t*` | `.toLowerCase()` (ASCII only) |
| `tsc_str_trim` | `tsc_str_t*` | `.trim()` |
| `tsc_str_repeat(s, n)` | `tsc_str_t*` | `.repeat(n)` |
| `tsc_str_pad_start(s, len, pad)` | `tsc_str_t*` | `.padStart(len, pad)` |
| `tsc_str_pad_end(s, len, pad)` | `tsc_str_t*` | `.padEnd(len, pad)` |
| `tsc_str_replace(s, needle, repl)` | `tsc_str_t*` | `.replace("a", "b")` (first match) |
| `tsc_str_replace_all(s, needle, repl)` | `tsc_str_t*` | `.replaceAll("a", "b")` (all matches) |
| `tsc_str_concat(a, b)` | `tsc_str_t*` | `a + b` |
| `tsc_str_split(s, sep)` | `tsc_array_t*` | `.split("a")` → array of strings |

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
| `tsc_array_slice(arr, start, end)` | `tsc_array_t*` | New array with copied range. |
| `tsc_array_append(dst, src)` | `tsc_array_t*` | Append `src`'s elements to `dst`. |
| `tsc_array_length(arr)` | `double` | For `.length` property. |
| `TSC_ARR(T, arr, i)` | lvalue | Macro for typed element access — `((T*)arr->data)[(size_t)i]`. |
| `tsc_array_oob(arr, i)` | `void` | Placeholder bounds-check hook (silent today, planned to throw `RangeError`). |

High-order methods like `.map`/`.filter`/`.reduce` are **not** runtime functions — they're expanded inline in the emitter (`emitArrayHof` in `src/emit/index.ts`).

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

## Regex (`tsc_regexp_t`)

Wraps POSIX extended regex (`<regex.h>`).

```c
typedef struct tsc_regexp {
    regex_t re;
    tsc_str_t* source;
    tsc_str_t* flags;
    bool global, ignore_case, multiline;
    bool compiled;
} tsc_regexp_t;
```

Translation from JS regex syntax happens inside `tsc_regexp_new`:

- `\d` → `[0-9]`, `\D` → `[^0-9]`
- `\w` → `[A-Za-z0-9_]`, `\W` → `[^A-Za-z0-9_]`
- `\s` → `[ \t\n\r\f\v]`, `\S` → `[^ \t\n\r\f\v]`
- Everything else passes through — POSIX ERE semantics apply (no lookahead/lookbehind, no named groups).

| Symbol | Signature |
|--------|-----------|
| `tsc_regexp_new(pattern, flags)` | `tsc_regexp_t*` |
| `tsc_regexp_test(re, s)` | `bool` |
| `tsc_str_match_regex(s, re)` | `tsc_array_t*` — array of match strings, or `NULL` if none |
| `tsc_str_replace_regex(s, re, repl)` | `tsc_str_t*` — honors the `g` flag |
| `tsc_str_split_regex(s, re)` | `tsc_array_t*` |

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
| `tsc_console_log_n(n, ...)` | `void` — n stringified args, space-joined, newline |
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
