# Testing

`tsc2c` uses a single end-to-end test harness: **compile each TS case, execute the resulting binary, diff stdout against an expected file**. Expected compile-failure cases use `expected.exitcode` instead. No separate unit test layer yet — by design. Every feature has at least one black-box test proving it produces correct output or the intended diagnostic.

The harness recreates its tiny `node_modules` package fixtures before case discovery, so running `bun install` does not remove the package-source cases needed by the Phase 14 tests.

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
e2e: buffer_object_methods … OK
e2e: bigint … OK
e2e: bitwise_assign … OK
e2e: class_computed_members … OK
e2e: computed_props … OK
e2e: custom_iterator_entry_destructure … OK
e2e: custom_iterator_inherited_next … OK
e2e: custom_iterator_object … OK
e2e: custom_iterator_self … OK
e2e: custom_predicates … OK
e2e: discriminated_union_nested … OK
e2e: discriminated_unions … OK
e2e: discriminated_union_switch … OK
e2e: array_concat_values … OK
e2e: array_copy_within … OK
e2e: array_fill … OK
e2e: array_at … OK
e2e: array_find_last … OK
e2e: array_from_map … OK
e2e: array_from_set … OK
e2e: array_from_string … OK
e2e: array_includes_same_value_zero … OK
e2e: array_is_array_narrowing … OK
e2e: array_keys_values … OK
e2e: array_last_index_of … OK
e2e: array_of … OK
e2e: array_own_properties … OK
e2e: array_property_descriptors … OK
e2e: array_reduce_no_initial … OK
e2e: array_reduce_right … OK
e2e: array_search_from_index … OK
e2e: array_to_reversed … OK
e2e: array_to_sorted … OK
e2e: array_to_spliced … OK
e2e: array_value_of … OK
e2e: array_with … OK
e2e: dynamic_array_methods … OK
e2e: dynamic_array_copy_within … OK
e2e: dynamic_array_fill … OK
e2e: dynamic_array_find_last … OK
e2e: dynamic_array_flat … OK
e2e: dynamic_array_to_reversed … OK
e2e: dynamic_array_to_sorted … OK
e2e: dynamic_array_to_sorted_comparator … OK
e2e: dynamic_array_to_spliced … OK
e2e: dynamic_array_with … OK
e2e: dynamic_bitwise_ops … OK
e2e: dynamic_array_flatmap … OK
e2e: dynamic_for_of … OK
e2e: dynamic_for_of_entries … OK
e2e: dynamic_for_of_rest … OK
e2e: dynamic_array_hof … OK
e2e: dynamic_array_hof_more … OK
e2e: dynamic_array_keys_values … OK
e2e: dynamic_array_of … OK
e2e: dynamic_array_object_enumeration … OK
e2e: dynamic_array_extensibility … OK
e2e: dynamic_array_reduce … OK
e2e: dynamic_array_reduce_no_initial … OK
e2e: dynamic_array_reduce_right … OK
e2e: dynamic_array_slice_reverse … OK
e2e: dynamic_array_sort … OK
e2e: dynamic_array_sort_comparator … OK
e2e: dynamic_array_splice … OK
e2e: dynamic_array_spread … OK
e2e: dynamic_string_match … OK
e2e: dynamic_string_match_string … OK
e2e: dynamic_array_at … OK
e2e: dynamic_coercions … OK
e2e: dynamic_index_assignment … OK
e2e: dynamic_last_index_of … OK
e2e: dynamic_methods … OK
e2e: dynamic_ops … OK
e2e: dynamic_property_assignment … OK
e2e: dynamic_property_logical_assign … OK
e2e: dynamic_property_ops … OK
e2e: dynamic_search_positions … OK
e2e: dynamic_string_search … OK
e2e: dynamic_string_at … OK
e2e: dynamic_string_code_point_at … OK
e2e: dynamic_string_concat … OK
e2e: dynamic_string_locale_compare … OK
e2e: dynamic_string_normalize … OK
e2e: dynamic_string_object_enumeration … OK
e2e: dynamic_string_pad_repeat … OK
e2e: dynamic_string_replace … OK
e2e: dynamic_string_replace_regex … OK
e2e: dynamic_string_replace_regex_groups … OK
e2e: dynamic_string_replace_string_tokens … OK
e2e: dynamic_string_split … OK
e2e: dynamic_string_split_limit … OK
e2e: dynamic_string_split_regex … OK
e2e: dynamic_string_substr … OK
e2e: dynamic_string_substring … OK
e2e: dynamic_string_trim_edges … OK
e2e: dynamic_unary_ops … OK
e2e: dynamic_update_ops … OK
e2e: exponent_assign … OK
e2e: dynamic_require … OK
e2e: function_value_spread … OK
e2e: generic_classes … OK
e2e: generic_function_values … OK
e2e: global_number_predicates … OK
e2e: in_operator_narrowing … OK
e2e: interface_inheritance … OK
e2e: weak_collections … OK
e2e: weak_ref … OK
e2e: line_directives … OK
e2e: logical_assign … OK
e2e: map_constructor_from_map … OK
e2e: map_set_constructors … OK
e2e: map_set_for_each … OK
e2e: map_set_for_each_refs … OK
e2e: map_set_same_value_zero … OK
e2e: native_addon … OK
e2e: namespaces … OK
e2e: number_constants … OK
e2e: number_constructor … OK
e2e: number_static_more … OK
e2e: number_to_exponential … OK
e2e: number_to_fixed … OK
e2e: number_to_precision … OK
e2e: math_constants_more … OK
e2e: math_int32_float … OK
e2e: math_more … OK
e2e: regex_pcre2 … OK
e2e: release_build … OK
e2e: rest_spread … OK
e2e: runtime_eval … OK
e2e: runtime_eval_unsafe_bridge … OK
e2e: runtime_function_constructor … OK
e2e: runtime_function_constructor_unsafe_bridge … OK
e2e: runtime_function_unsafe_bridge … OK
e2e: set_constructor_from_set … OK
e2e: set_keys … OK
e2e: set_immediate … OK
e2e: set_timeout_zero … OK
e2e: string_at … OK
e2e: string_char_code_at … OK
e2e: string_concat … OK
e2e: string_for_of … OK
e2e: string_last_index_of … OK
e2e: string_locale_compare … OK
e2e: string_raw … OK
e2e: switch_exhaustive … OK
e2e: switch_exhaustive_missing … OK
e2e: symbols … OK
e2e: tagged_templates … OK
e2e: tail_calls … OK
e2e: string_match_all … OK
e2e: string_match_string … OK
e2e: string_from_code_point … OK
e2e: string_normalize … OK
e2e: string_object_enumeration … OK
e2e: string_object_methods … OK
e2e: string_replace_regex_groups … OK
e2e: string_replace_string_tokens … OK
e2e: string_search_positions … OK
e2e: string_search_regex … OK
e2e: string_search_string … OK
e2e: string_split_limit … OK
e2e: string_substr … OK
e2e: string_substring … OK
e2e: string_boolean_constructors … OK
e2e: string_trim_aliases … OK
e2e: string_trim_edges … OK
e2e: array_to_string … OK
e2e: object_accessor_arrows … OK
e2e: object_accessor_closures … OK
e2e: object_accessor_preserve … OK
e2e: object_accessor_redefine … OK
e2e: object_accessors … OK
e2e: object_array_enumeration … OK
e2e: object_assign_array_target … OK
e2e: object_assign_array_string … OK
e2e: object_create_descriptors … OK
e2e: object_define_properties … OK
e2e: object_define_property … OK
e2e: object_descriptor_defaults … OK
e2e: object_descriptor_kind_transition … OK
e2e: object_descriptor_redefine … OK
e2e: object_descriptor_shorthand … OK
e2e: object_descriptors … OK
e2e: dynamic_object_entries … OK
e2e: dynamic_object_from_entries … OK
e2e: dynamic_array_to_string … OK
e2e: dynamic_array_value_of … OK
e2e: object_entries … OK
e2e: object_extensibility … OK
e2e: object_from_entries_map … OK
e2e: object_get_own_property_descriptors … OK
e2e: object_has_own_property … OK
e2e: object_is … OK
e2e: object_is_prototype_of … OK
e2e: object_property_is_enumerable … OK
e2e: object_prototype_call … OK
e2e: object_prototype_is_prototype_of_call … OK
e2e: object_prototype_nullish_call … OK
e2e: object_prototype_to_locale_string_call … OK
e2e: object_prototype_to_string_call … OK
e2e: object_prototype_value_of_call … OK
e2e: object_prototypes … OK
e2e: object_seal_freeze … OK
e2e: object_static_methods … OK
e2e: object_to_locale_string … OK
e2e: object_to_string … OK
e2e: object_value_of … OK
e2e: primitive_object_methods … OK
e2e: dynamic_number_to_string … OK
e2e: symbol_bigint_object_methods … OK
e2e: collection_object_methods … OK
e2e: comma_operator … OK
e2e: promise_callback_adopt … OK
e2e: promise_finally_adopt … OK
e2e: promise_try … OK
e2e: reflect_apply … OK
e2e: reflect_construct … OK
e2e: reflect_dynamic … OK
e2e: reflect_get_own_property_descriptor … OK
e2e: regexp_escape … OK
e2e: regexp_exec … OK
e2e: regexp_extra_flags … OK
e2e: regexp_object_methods … OK
e2e: typed_object_has_own … OK
e2e: typed_object_methods … OK
e2e: typed_object_property_names … OK
e2e: typed_property_descriptor … OK
e2e: typed_property_descriptors … OK
e2e: typed_reflect_get … OK
e2e: typed_reflect_has … OK
e2e: typed_reflect_own_keys … OK
e2e: typed_reflect_set … OK
e2e: string_well_formed … OK
e2e: typeof_boolean_union … OK
e2e: typeof_guards … OK
e2e: url_base … OK
e2e: url_can_parse … OK
e2e: url_object_methods … OK
e2e: url_parse … OK
e2e: void_operator … OK
e2e: wordcount … OK

652 passed, 0 failed
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
