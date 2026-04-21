# Testing

`tsc2c` uses a single end-to-end test harness: **compile each TS case, execute the resulting binary, diff stdout against an expected file**. No separate unit test layer yet — by design. Every feature has at least one black-box test proving it produces correct output.

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
...
e2e: wordcount … OK

24 passed, 0 failed
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

Each subdirectory under `tests/e2e/cases/` is one test. The harness auto-discovers every directory with both `in.ts` and `expected.stdout`.

## How the harness works

`tests/e2e/run.ts` does:

1. Discover all test directories.
2. For each case:
   - Call `compile({ entry: in.ts, output: /tmp/<case>, buildDir: /tmp/<case>-build, noGc: env })`.
   - If compile exits non-zero → print the error → mark **COMPILE FAIL**.
   - Else run the binary with no stdin.
   - If the binary exits non-zero → **RUN FAIL**.
   - Else diff captured stdout against `expected.stdout`.
   - If they differ → **STDOUT MISMATCH** with both blocks printed.
   - Else → **OK**.
3. Print the tally. Exit 0 if everything OK, else 1.

Source: [`tests/e2e/run.ts`](../tests/e2e/run.ts).

## Adding a new test case

1. Create `tests/e2e/cases/<name>/`.
2. Write `in.ts` — the program.
3. Write `expected.stdout` — exactly what stdout should look like, including trailing newline.
4. Run `TSC2C_NO_GC=1 bun tests/e2e/run.ts`.

If your test imports other files, add them to the same directory. They're auto-picked-up by the TS program walker.

### Tips for writing deterministic tests

- Avoid timing (`Date.now()` values differ between runs). Test only *relative* properties: `t1 >= t0` instead of the actual value.
- Avoid `Math.random()` — it's not seeded deterministically.
- For `os.platform()` / `arch()` / `hostname()`, assert properties like `.length > 0` rather than the exact string.
- Avoid testing `process.argv` directly — the binary's argv changes between bun-level runs and stand-alone invocations.
- C function-argument evaluation order is unspecified. `console.log(f(), f(), f())` may reorder. Hoist into temps: `const a = f(); const b = f(); console.log(a, b);`.

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

- **Error paths at the emit level** — the 3 exit codes (1 gcc, 2 TS, 3 emitter) aren't explicitly tested with expected-failure cases. If you add a case that expects compile failure, add an `expected.exitcode` file and extend the harness.
- **Multi-config matrix** — only `--no-gc` vs default. macOS / Windows / clang paths aren't exercised yet.
- **Binary size / perf regressions** — not measured.
- **Stdlib edge cases** at scale — we test "happy path" for each feature. Fuzz / property-based testing would improve coverage.

These are candidate Phase 15 work. See [`todo.md`](todo.md).

## Related

- [`architecture.md`](architecture.md#diagnostics-flow) — where the three exit codes come from.
- [`runtime-reference.md`](runtime-reference.md) — what runtime symbols you're testing against.
- [`cli.md`](cli.md) — flags useful for debugging (`--keep-build-dir`, `--emit-c-only`, `--verbose`).
