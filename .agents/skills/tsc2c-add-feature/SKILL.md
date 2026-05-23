---
name: tsc2c-add-feature
description: Procedural skill for adding a new TypeScript language feature or stdlib method to the typescriptc transpiler. Use when a user asks to add a built-in method, operator, syntax construct, or Node stdlib API to tsc2c.
---

# Adding a feature to tsc2c

This is the standard flow. Follow it instead of improvising.

## Prereqs

Before writing code, read:

1. [docs/architecture.md](../../../docs/architecture.md) — the six-pass emitter structure and AOT module graph.
2. [docs/done.md](../../../docs/done.md) — check the feature isn't already there.
3. [docs/todo.md](../../../docs/todo.md) — check the feature isn't blocked by a bigger item (e.g. anything requiring dynamic values is blocked on Phase 3).

## The core-file checklist

Every feature addition touches most or all of these:

| File | What |
|------|------|
| `stdlib/lib.core.d.ts` | Add TS declaration so the type checker accepts user code using it |
| `src/emit/types.ts` | If it needs a new CType (new runtime type), add it here |
| `src/emit/index.ts` | Add the emitter case to the right dispatcher |
| `runtime/tsc_runtime.h` | Declare the new C runtime function |
| `runtime/tsc_runtime.c` | Implement it |
| `tests/e2e/cases/<feature>/` | Add `in.ts` + `expected.stdout` |

Skip only the files that genuinely don't apply. E.g. a new operator often touches only the emitter and the test case.

## Which dispatcher to extend (in `src/emit/index.ts`)

Find the right method by the category of the new feature:

| Category | Method |
|----------|--------|
| New statement kind | `emitStmt` |
| New expression kind | `emitExpr` |
| New binary operator | `emitBinary` switch |
| New array method | `emitArrayMethod` switch |
| New array HOF (map-like) | `emitArrayHof` |
| New string method | `emitStringMethod` switch |
| New `Math.xxx` | `emitMathCall` switch |
| New `fs.xxx` (sync) | `emitFsCall` switch |
| New `path.xxx` | `emitPathCall` switch |
| New `os.xxx` | `emitOsCall` switch |
| New `Number.xxx` static | `emitNumberStatic` switch |
| New `Object.xxx` static | `emitObjectCall` switch |
| New `JSON.xxx` | `emitJsonCall` / `stringifyJsonValue` |
| New class like `Map` / `Set` | dedicated method + new CType kind |
| New Map method | `emitMapMethod` switch |
| New Set method | `emitSetMethod` switch |
| New RegExp method | `emitRegexpMethod` switch |

## Pattern: add a new string method

Concrete example — say the user wants `String.prototype.at(i)`.

1. **`stdlib/lib.core.d.ts`**: add `at(i: number): string;` to the `String` interface.
2. **`runtime/tsc_runtime.h`**: declare `tsc_str_at(const tsc_str_t* s, double i);`.
3. **`runtime/tsc_runtime.c`**: implement it — probably a few lines similar to `tsc_str_char_at` but with negative-index support.
4. **`src/emit/index.ts`**: in `emitStringMethod`, add:

   ```ts
   case "at": {
       if (args.length !== 1) unsupported(call, "at expects 1 arg");
       const idx = this.emitExpr(args[0]!);
       requireNumber(args[0]!, idx.ty);
       return { c: `tsc_str_at(${recv.c}, ${idx.c})`, ty: T_STRING };
   }
   ```
5. **`tests/e2e/cases/string_at/`**: write `in.ts` that calls `.at(0)`, `.at(-1)` etc. and `expected.stdout` with the outputs.
6. Run `TSC2C_NO_GC=1 bun tests/e2e/run.ts` — expect all cases still pass including the new one.
7. Update [docs/done.md](../../../docs/done.md) — add a bullet under "Strings" section.
8. Remove the feature from [docs/todo.md](../../../docs/todo.md) if it was listed there.
9. Append to [CHANGELOG.md](../../../CHANGELOG.md) under "Unreleased → Added".

## Pattern: add a new operator

Example — say the user wants `??=` (nullish coalescing assignment).

1. **`src/emit/index.ts`** `emitBinary`: the `QuestionQuestionEqualsToken` case probably needs adding. Look at how `??` and `+=` are each handled for patterns.
2. **`tests/e2e/cases/nullish_assign/`**: add a test.
3. Docs update.

No runtime work — operators lower to C operations on existing types.

## Pattern: add a feature that needs a new CType

Example — `Date` as a real class with methods (not just `Date.now`).

1. **`src/emit/types.ts`**: add `"date"` to `CTypeKind`, export `T_DATE: CType`, teach `mapTsType` to return it when TS sees the `Date` type symbol.
2. **`runtime/tsc_runtime.h`**: declare `tsc_date_t` struct + constructor + methods.
3. **`runtime/tsc_runtime.c`**: implement.
4. **`src/emit/index.ts`**: add `emitDateMethod` dispatcher for instance method calls; in `emitMethodCall`, route `recv.ty.kind === "date"` to it. In `emitNew`, handle `new Date(...)`. In `coerce*` / equality, treat date like a pointer kind.
5. **`stdlib/lib.core.d.ts`**: expand the `Date` interface declaration.
6. Test + docs + changelog as usual.

## Rules

- **Don't bypass the type check.** User code must satisfy `stdlib/lib.core.d.ts`. If you accept TS the shim rejects, the error will appear at exit code 2 — the user will think their code is wrong.
- **Don't emit ad-hoc C strings.** Use the `CType` helpers and the dispatcher structure. One-off string concatenation bypasses the type-coercion checks and will bite you later.
- **Every new method/operator needs a test case.** Not optional. Pick focused tests (1 feature, a few lines) for regression purposes — compound tests like `wordcount` don't protect individual features well.
- **Document in `docs/done.md` with a pointer to the test case.** That's how the skill knows what to check against.
- **Append to `CHANGELOG.md` under "Unreleased".** One line per meaningful addition.

## Anti-patterns

- ❌ Skipping the CType step and emitting `void*` everywhere. You'll lose type safety and later coercion checks will fail confusingly.
- ❌ Inlining runtime logic into the emitter instead of adding a `tsc_*` function. Makes generated C huge and slower to compile; also duplicates work across call sites. Put shared logic in `runtime/tsc_runtime.c`.
- ❌ Adding a feature without updating `stdlib/lib.core.d.ts`. The user's TS code won't type-check even though your emitter supports it.
- ❌ "Quick fix" — running gcc manually and patching the generated C. If you need to change the output, change the emitter.
- ❌ Not checking whether the feature is blocked on Phase 3 (dynamic values). Features that need `any` / `unknown` / heterogeneous collections / `JSON.parse` can't be cleanly added before that phase. Surface the block in `docs/todo.md` instead.

## AOT closure requirements

Native C++ addons, runtime code compilation, and dynamic `require(variable)` are not permanent product limits. They are AOT closure requirements:

- Native addons must be known at compile time through the native-addon manifest and lowered through the embedded Node bridge linked with `libnode`.
- Constant and allow-listed `eval(...)` / `Function(...)` sources compile AOT. Truly unknown runtime source strings require the explicit `--unsafe-eval` gate and the embedded Node bridge.
- Dynamic `require(...)` needs a finite static proof or a `--dynamic-require-manifest` allow list so every reachable module is in the AOT graph.

Push back only when the requested shape cannot be proven or allow-listed at build time, or when it would require enabling unsafe eval without the compile-time gate.

## Verify after your change

```bash
# 1. tsc still type-checks our own source
bun run build

# 2. all existing tests still pass
TSC2C_NO_GC=1 bun tests/e2e/run.ts
# → 24 passed, 0 failed (+ your new case)

# 3. if you changed runtime/, spot-check with --verbose on an affected example
./bin/tsc2c examples/<affected>.ts -o /tmp/ex --no-gc --verbose
/tmp/ex
```

## References

- Canonical docs: [docs/README.md](../../../docs/README.md)
- Full remaining-work list: [docs/todo.md](../../../docs/todo.md)
- Architecture + diagrams: [docs/architecture.md](../../../docs/architecture.md)
- C runtime API: [docs/runtime-reference.md](../../../docs/runtime-reference.md)
- Test harness: [docs/testing.md](../../../docs/testing.md)
- Historical context: [CHANGELOG.md](../../../CHANGELOG.md)
- Full plan (multi-phase): `~/.Codex/plans/make-a-typescript-to-floating-comet.md`
