# Testing

`tsc2c` uses a single end-to-end test harness: **compile each TS case, execute the resulting binary, diff stdout against an expected file**. Expected compile-failure cases use `expected.exitcode` instead. No separate unit test layer yet — by design. Every feature has at least one black-box test proving it produces correct output or the intended diagnostic.

## Running the suite

```bash
cd /home/adam/dev/innovation/TypeScriptC

# with libgc-dev installed:
bun tests/e2e/run.ts

# without libgc-dev (leaking fallback):
TSC2C_NO_GC=1 bun tests/e2e/run.ts
```

Expected output:

```
e2e: advanced … OK
e2e: arith … OK
e2e: array_static_dynamic … OK
...
e2e: buffer … OK
e2e: bigint … OK
e2e: computed_props … OK
e2e: custom_iterator_object … OK
e2e: custom_predicates … OK
e2e: discriminated_unions … OK
e2e: array_copy_within … OK
e2e: array_fill … OK
e2e: array_at … OK
e2e: array_find_last … OK
e2e: array_last_index_of … OK
e2e: array_of … OK
e2e: array_reduce_right … OK
e2e: array_to_reversed … OK
e2e: array_to_sorted … OK
e2e: array_to_spliced … OK
e2e: array_with … OK
e2e: dynamic_array_methods … OK
e2e: dynamic_array_copy_within … OK
e2e: dynamic_array_fill … OK
e2e: dynamic_array_find_last … OK
e2e: dynamic_array_flat … OK
e2e: dynamic_array_to_reversed … OK
e2e: dynamic_array_to_sorted … OK
e2e: dynamic_array_to_spliced … OK
e2e: dynamic_array_with … OK
e2e: dynamic_array_flatmap … OK
e2e: dynamic_array_hof … OK
e2e: dynamic_array_hof_more … OK
e2e: dynamic_array_of … OK
e2e: dynamic_array_reduce … OK
e2e: dynamic_array_reduce_right … OK
e2e: dynamic_array_sort … OK
e2e: dynamic_array_splice … OK
e2e: dynamic_array_at … OK
e2e: dynamic_coercions … OK
e2e: dynamic_index_assignment … OK
e2e: dynamic_last_index_of … OK
e2e: dynamic_methods … OK
e2e: dynamic_ops … OK
e2e: dynamic_property_assignment … OK
e2e: dynamic_property_ops … OK
e2e: dynamic_string_at … OK
e2e: dynamic_string_concat … OK
e2e: dynamic_string_locale_compare … OK
e2e: dynamic_string_normalize … OK
e2e: dynamic_string_pad_repeat … OK
e2e: dynamic_string_replace … OK
e2e: dynamic_string_split … OK
e2e: dynamic_string_substring … OK
e2e: dynamic_string_trim_edges … OK
e2e: dynamic_require … OK
e2e: generic_classes … OK
e2e: generic_function_values … OK
e2e: weak_collections … OK
e2e: weak_ref … OK
e2e: line_directives … OK
e2e: native_addon … OK
e2e: namespaces … OK
e2e: regex_pcre2 … OK
e2e: release_build … OK
e2e: rest_spread … OK
e2e: runtime_eval … OK
e2e: runtime_function_constructor … OK
e2e: string_at … OK
e2e: string_concat … OK
e2e: string_for_of … OK
e2e: string_last_index_of … OK
e2e: string_locale_compare … OK
e2e: switch_exhaustive … OK
e2e: switch_exhaustive_missing … OK
e2e: symbols … OK
e2e: tagged_templates … OK
e2e: tail_calls … OK
e2e: string_match_all … OK
e2e: string_normalize … OK
e2e: string_substring … OK
e2e: string_trim_edges … OK
e2e: object_accessors … OK
e2e: object_define_property … OK
e2e: object_descriptors … OK
e2e: dynamic_object_entries … OK
e2e: dynamic_object_from_entries … OK
e2e: object_entries … OK
e2e: object_extensibility … OK
e2e: object_get_own_property_descriptors … OK
e2e: object_has_own_property … OK
e2e: object_is … OK
e2e: object_is_prototype_of … OK
e2e: object_property_is_enumerable … OK
e2e: object_prototypes … OK
e2e: object_seal_freeze … OK
e2e: object_static_methods … OK
e2e: object_to_locale_string … OK
e2e: object_to_string … OK
e2e: object_value_of … OK
e2e: reflect_dynamic … OK
e2e: reflect_get_own_property_descriptor … OK
e2e: typeof_guards … OK
e2e: url_parse … OK
e2e: wordcount … OK

146 passed, 0 failed
```

Non-zero exit if any case fails.

## Test layout

```
tests/e2e/
├── run.ts                 — the harness
└── cases/
    ├── hello/
    │   ├── in.ts          — the program to compile
    │   └── expected.stdout — expected output when the binary runs
    ├── fizzbuzz/
    ├── ...
    └── modules/
        ├── in.ts          — the entry file
        ├── math.ts        — additional module imported by in.ts
        ├── greeter.ts
        └── expected.stdout
```

Each subdirectory under `tests/e2e/cases/` is one test. The harness auto-discovers every directory with `in.ts` plus either `expected.stdout` or `expected.exitcode`. A case may also include `expected.mainc.contains` to assert that generated `main.c` contains a substring; `{{ENTRY}}` expands to the case entry path. A `compile.release` marker compiles that case with `--release`.

## How the harness works

`tests/e2e/run.ts` does:

1. Discover all test directories.
2. For each case:
   - Call `compile({ entry: in.ts, output: /tmp/<case>, buildDir: /tmp/<case>-build, noGc: env, release: marker })`.
   - If `expected.exitcode` exists, compare the compile exit code and skip binary execution.
   - If compile exits non-zero unexpectedly → print the error → mark **COMPILE FAIL**.
   - If `expected.mainc.contains` exists, check the generated C before running the binary.
   - Run the binary with no stdin.
   - If the binary exits non-zero → **RUN FAIL**.
   - Else diff captured stdout against `expected.stdout`.
   - If they differ → **STDOUT MISMATCH** with both blocks printed.
   - Else → **OK**.
3. Print the tally. Exit 0 if everything OK, else 1.

Source: [`tests/e2e/run.ts`](../tests/e2e/run.ts).

## Adding a new test case

1. Create `tests/e2e/cases/<name>/`.
2. Write `in.ts` — the program.
3. Write `expected.stdout` — exactly what stdout should look like, including trailing newline. For an expected compile failure, write `expected.exitcode` instead.
4. Run `TSC2C_NO_GC=1 bun tests/e2e/run.ts`.

If your test imports other files, add them to the same directory. They're auto-picked-up by the TS program walker.

### Tips for writing deterministic tests

- Avoid timing (`Date.now()` values differ between runs). Test only *relative* properties: `t1 >= t0` instead of the actual value.
- Avoid `Math.random()` — it's not seeded deterministically.
- For `os.platform()` / `arch()` / `hostname()`, assert properties like `.length > 0` rather than the exact string.
- Avoid testing `process.argv` directly — the binary's argv changes between bun-level runs and stand-alone invocations.
- Call arguments with side effects should preserve JavaScript's left-to-right order. Keep focused coverage like `call_arg_order` when changing call emission.

### Choosing a focused or compound test

- **Focused test** (e.g. `math`, `nullish`): one TS feature, a few lines, tight stdout. Most tests should be focused.
- **Compound test** (e.g. `wordcount`, `collections`): multiple features combined into one realistic program. Keep one or two of these to verify real-world composition — but don't lean on them for individual-feature regressions.

## Debugging a failing test

1. Run just that case with `--verbose` to see the gcc command and any C warnings:
   ```bash
   bun src/cli.ts tests/e2e/cases/foo/in.ts -o /tmp/foo --no-gc --verbose --keep-build-dir /tmp/foo-build
   ```
2. Look at the generated C: `cat /tmp/foo-build/main.c`.
3. Try the emit-only path if gcc is failing:
   ```bash
   bun src/cli.ts tests/e2e/cases/foo/in.ts -o /tmp/foo --emit-c-only --keep-build-dir /tmp/foo-build
   ```
4. If the C looks right but the binary behaves wrong, compile with `-g` manually from the build dir:
   ```bash
   cd /tmp/foo-build
   gcc -g -std=c11 main.c tsc_runtime.c -lm -DTSC_NO_GC -o foo-debug
   gdb ./foo-debug
   ```

## What's NOT tested yet

- **Error paths at the emit level** — expected-failure coverage exists for emitter diagnostics, but broader exit-code coverage is still thin.
- **Multi-config matrix** — `--no-gc`, default, and one `--release` case are covered. macOS / Windows / clang paths aren't exercised yet.
- **Binary size / perf regressions** — not measured.
- **Stdlib edge cases** at scale — we test "happy path" for each feature. Fuzz / property-based testing would improve coverage.

These are candidate Phase 15 work. See [`todo.md`](todo.md).

## Related

- [`architecture.md`](architecture.md#diagnostics-flow) — where the three exit codes come from.
- [`runtime-reference.md`](runtime-reference.md) — what runtime symbols you're testing against.
- [`cli.md`](cli.md) — flags useful for debugging (`--keep-build-dir`, `--emit-c-only`, `--verbose`).
