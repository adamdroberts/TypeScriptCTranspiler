# Testing

The primary regression harness compiles each TypeScript case, executes the resulting binary, and diffs stdout against an expected file. Expected compile-failure cases use `expected.exitcode`, and opt-in runtime diagnostics can assert stderr. Separate compliance self-tests validate Test262 metadata, execution modes, the host protocol, and independent specification extraction.

The harness recreates its tiny `node_modules` package fixtures before case execution, so running `bun install` does not remove the package-source cases needed by the Phase 14 tests.

A directory under `tests/e2e/cases/` enters the canonical worklist when it has exactly one of `in.ts` or `generate.json`. It must also have `expected.stdout`, `expected.exitcode`, or `compile.emit_c_only`; malformed cases fail discovery instead of being silently skipped.

## Running the suite

The full e2e suite can take hours on a large checkout. Do not run it by default
while iterating on a bounded change; prefer `bun run build`, `git diff --check`,
and the narrowest relevant e2e case or `--filter` selection. Run the full suite
only when the change has broad cross-cutting risk or you explicitly need release
confidence.

```bash
cd /path/to/TypeScriptC

# with libgc-dev installed:
bun tests/e2e/run.ts

# without libgc-dev (leaking fallback):
TSC2C_NO_GC=1 bun tests/e2e/run.ts
```

The harness streams each discovered case result and exits non-zero if any compile, runtime, diagnostic, or output assertion fails. The final tally is a regression-run diagnostic only; its aggregate value is never language-coverage evidence.

## ECMAScript 2026 conformance evidence

The native E2E corpus remains a required regression layer, but it cannot establish complete language coverage. The full claim gate additionally uses the exact ECMA-262 2026 source revision, an exact Test262 Git tree, a generated normative clause/choice/optional-family catalog, a canonical feature-tag map, reciprocal evidence registrations, and independently evidenced semantic partitions.

```bash
# Materialize and verify the exact spec and Test262 revisions.
bun run prepare:e2e-fixtures
bun run compliance:fetch

# Static/generated policy integrity.
bun run compliance:catalog:check
bun run compliance:features:check
bun run compliance:self-test
bun run compliance:matrix

# Inspect the exhaustive scenario inventory. Classification issues are claim blockers.
bun run compliance:inventory -- --fail-on-issues

# A targeted diagnostic run is useful while the native host is incomplete.
bun run test:test262 -- --allow-ineligible-host --filter test/path-fragment

# These are release-evidence commands. The checked-in ineligible host and the
# unresolved exact matrix currently keep them fail-closed.
bun run test:test262
bun run compliance:local
bun run compliance:claim
```

The targeted command above produces diagnostic, non-claimable evidence. The property gate recursively discovers every tracked `tests/property/**/*.property.test.ts`, requires every specification to execute at least one test, and fails on any failure, skip, or todo.

The runner expands the official strict, non-strict, Module, raw, async, and `[[CanBlock]]` modes; evaluates harness files as separate same-Realm global Scripts; supplies one independently attested sibling-resource directory for every scenario so Module and computed/eval dynamic-import resolution do not depend on source-shape scanning; and requires exact negative phase, origin, and constructor observations. An unavailable hook is an infrastructure error, never a skip. The host does not receive expected negative metadata, and the claim checker independently derives each verdict from its recorded observation. Under protocol 4, a future eligible host may only prepare artifacts in an ephemeral runner-owned directory. Every host/local command runs under a rebuilt Linux child-subreaper supervisor, and runtime observations come from a sealed, dynamically loaded native executable only after the rebuilt seccomp guard proves activation through a private handshake and kernel-state check. The guard prevents new processes and executable mappings; the supervisor rejects detached survivors. The runner rehashes the artifacts and authors the transcript, and the claim checker rebuilds and compares the containment identities. Capability booleans or host-reported hashes cannot turn the diagnostic host into evidence.

Large runs may be split by deterministic path hash. `compliance:test262:merge` and `compliance:local:merge` accept `--input-dir`; they require exact shard/gate set equality before producing the exhaustive reports consumed by `compliance:claim`. A filtered run is useful only for development and can never satisfy the claim. Local JSON reports are diagnostic: an eligible claim additionally requires GitHub Sigstore artifact-attestation bundles for both merged reports, restricted to the exact repository, conformance workflow, source revision, and GitHub-hosted runner policy.

[`ecmascript-2026-coverage.md`](ecmascript-2026-coverage.md) is generated from the canonical matrix. Work by semantic partition and the project’s cardinality rule: one general representation/lowering, compact property evidence, and a separate representative stress case. Each local artifact must be registered in `compliance/ecmascript-2026/evidence-registry.json` with reciprocal exact partition targets. A claim-bearing stress record names one exact generated positive native-runtime case; its reviewed high-depth value must equal the numeric parameter independently parsed from the tracked `generate.json`. The existing generated cases are regression/stress inputs, not property proof. The property gate exists but remains intentionally empty and failing until semantic-partition specifications are registered.

The manual **ECMAScript 2026 conformance evidence** GitHub Actions workflow is the release evidence path. Dispatch it for the exact source revision being assessed. It seals and cryptographically attests each source report before transport, verifies every input before merging, attests the merged reports consumed by the checker, and attests the final claim. The checker verifies an immutable copy of the exact bytes it parsed and requires that digest in the signed statement. Verify a downloaded claim with `gh attestation verify <claim.json> --repo adamdroberts/TypeScriptCTranspiler --signer-workflow adamdroberts/TypeScriptCTranspiler/.github/workflows/ecmascript-conformance.yml`. While the checked-in host is ineligible, preflight is expected to finish red and upload a signed blocked diagnostic as `ecmascript-2026-claim-<source-sha>`; an eligible host additionally produces and merges the shorter-lived Test262 shard and local-gate artifacts before the claim job. A red blocked artifact is evidence of unresolved work, not a conformance result. Signatures bind evidence to the exact reviewed source and trusted workflow; they do not make an unreviewed or intentionally dishonest runner revision trustworthy.

The exact E2E evidence gates use `--fail-on-skip`. The release profile fixes `TSC2C_LIBDISPATCH_PREFIX=/usr/share/swift/usr`, verifies the Swift libdispatch header/library before evidence work, and records their exact file identities with the rest of the toolchain. If that dependency is absent, the release claim remains blocked rather than silently narrowing its regressions.

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

Each subdirectory under `tests/e2e/cases/` is one test when it has exactly one of `in.ts` or `generate.json`, plus `expected.stdout`, `expected.exitcode`, or `compile.emit_c_only`. The shared case-manifest module is the canonical worklist used by both the runner and the compliance evidence validator; probe/asset-only directories are not evidence. A case may also include `expected.mainc.contains` to assert that generated `main.c` contains a substring, or `expected.mainc.not_contains` to assert that one substring per line is absent; `{{ENTRY}}` expands to the case entry path. `run.env` adds `KEY=VALUE` pairs to the binary execution environment. For an expected compile failure, `expected.stderr.contains` checks captured compiler diagnostics; for a runtime case, it checks captured binary stderr. A `compile.release` marker compiles that case with `--release`.

## How the harness works

`tests/e2e/run.ts` does:

1. Discover all test directories.
2. For each case:
   - Call `compile({ entry: in.ts, output: /tmp/<case>, buildDir: /tmp/<case>-build, noGc: env, release: marker })`.
   - If `expected.exitcode` exists, compare the compile exit code, check any exact `expected.stderr.contains` assertion, and skip binary execution.
   - If compile exits non-zero unexpectedly → print the error → mark **COMPILE FAIL**.
   - If `expected.mainc.contains` or `expected.mainc.not_contains` exists, check the generated C before running the binary.
   - Run the binary with no stdin, plus any environment entries from `run.env`.
   - If the binary exits non-zero → **RUN FAIL**.
   - If `expected.stderr.contains` exists, assert that captured stderr includes it.
   - Diff captured stdout against `expected.stdout`.
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
- **Multi-config matrix** — `--no-gc`, default, one `--release` case, and Linux gcc/clang CI lanes are covered. macOS / Windows jobs aren't exercised yet.
- **Binary size / perf regressions** — release builds on Linux use section-level garbage collection, and the manual benchmark harness records `tsc2c` output binary bytes and timing/ops data; `bun run bench:check -- <results.json> [policy.json]` can enforce thresholds from a JSON policy, with `MAX_BINARY_BYTES`, `MAX_TSC2C_MS`, `MIN_VS_BUN`, and `MIN_VS_NODE` as local overrides. `bun run bench:smoke` uses `manual-tests/benchmarks/thresholds-smoke.json` for the default local/CI smoke, and `bun run bench:long` uses `manual-tests/benchmarks/thresholds-long.json` for scheduled/manual broader benchmark policy. Linux GitHub Actions matrix wiring runs gcc and clang build, no-GC e2e, benchmark smoke, and scheduled/manual long benchmark policy. macOS / Windows matrix jobs still remain.
- **Inline-cache baselines** — `TSC_DYNAMIC_STATS=1` makes compiled binaries print dynamic property-operation counters, object shape-update counters, and dynamic property cache hit/miss counters to stderr at process exit. `dynamic_runtime_stats` covers the opt-in path plus repeated cached literal property reads, string-key element reads, receiver-aware `Reflect.get` reads, direct dynamic writes, and three- and four-argument dynamic `Reflect.set` writes. Deeper polymorphic/hidden-class cache work remains Phase 15 work.
- **Property evidence specifications** — the standalone recursive property gate is implemented and fail-closed, but no `*.property.test.ts` semantic-partition specifications are registered yet. Terminal compliance partitions remain unresolved until they link real property evidence retained alongside generated stress and E2E.

These are candidate Phase 15 work. See [`todo.md`](todo.md).

## Related

- [`architecture.md`](architecture.md#diagnostics-flow) — where the three exit codes come from.
- [`runtime-reference.md`](runtime-reference.md) — what runtime symbols you're testing against.
- [`cli.md`](cli.md) — flags useful for debugging (`--keep-build-dir`, `--emit-c-only`, `--verbose`).
