# TypeScriptC documentation

This directory is the full documentation set for `typescriptc` (CLI: `tsc2c`) — a whole-program TypeScript-to-C transpiler that produces native Linux binaries.

If you're new, start with the top-level [`../README.md`](../README.md) for the product story + quick start.

## By role

**I want to use it** (write TS, get a binary):
1. [`../README.md`](../README.md) — install, quick start, feature tour
2. [`cli.md`](cli.md) — every CLI flag + exit code + env var
3. [`done.md`](done.md) — every language and stdlib feature you can use today
4. [`todo.md`](todo.md) — what you can't use today and when it's planned

**I want to understand how it works** (read the code, change it):
1. [`architecture.md`](architecture.md) — pipeline, emission passes, module graph, value model (diagrams included)
2. [`runtime-reference.md`](runtime-reference.md) — every `tsc_*` runtime symbol grouped by area
3. [`testing.md`](testing.md) — the e2e harness and how to add a new case
4. [`../src/emit/index.ts`](../src/emit/index.ts) — the emitter itself; ~6,000 LOC, one class with focused methods
5. [`../CHANGELOG.md`](../CHANGELOG.md) — evolution of capability session by session

**I'm an LLM agent**:
1. [`../llms.txt`](../llms.txt) — one-screen index
2. [`../llms-full.txt`](../llms-full.txt) — single-file ingestion bundle
3. [`../.claude/skills/tsc2c-add-feature/SKILL.md`](../.claude/skills/tsc2c-add-feature/SKILL.md) — procedural skill for adding a language feature

## By topic

| Area | Page |
|------|------|
| Install + quick start | [`../README.md`](../README.md) |
| Full feature list | [`done.md`](done.md) |
| Remaining work | [`todo.md`](todo.md) |
| Changelog | [`../CHANGELOG.md`](../CHANGELOG.md) |
| CLI reference | [`cli.md`](cli.md) |
| Architecture + diagrams | [`architecture.md`](architecture.md) |
| C runtime API | [`runtime-reference.md`](runtime-reference.md) |
| Testing | [`testing.md`](testing.md) |
| Agent skills | [`../.claude/skills/tsc2c-add-feature/SKILL.md`](../.claude/skills/tsc2c-add-feature/SKILL.md) |
| LLM index | [`../llms.txt`](../llms.txt) |
| LLM full bundle | [`../llms-full.txt`](../llms-full.txt) |
| Original 15-phase plan | `~/.claude/plans/make-a-typescript-to-floating-comet.md` |

## Surface overview

`tsc2c` is four things:

- **CLI** — `bin/tsc2c` → `src/cli.ts` → `src/compile.ts`. Thin argv parser, orchestrates the pipeline.
- **Compiler pipeline** — `src/compile.ts` glues together `ts.createProgram` (official TS API), `src/resolve.ts` (module graph), and `src/emit/index.ts` (AST → C).
- **C runtime** — `runtime/tsc_runtime.c` + `runtime/tsc_runtime.h`. Every produced binary links against this. Covers strings, arrays, Map/Set, regex, exceptions, fs, path, os, Math, console, process, JSON helpers.
- **Type shim** — `stdlib/lib.core.d.ts`. Replaces `@types/node` with our minimal declarations so TS's type checker accepts the language subset we support.

See [`architecture.md`](architecture.md) for how these fit together.

## What "deep" documentation covers here

Each page targets a specific question:

- `architecture.md` — "What does the pipeline do at each stage?"
- `cli.md` — "What does flag X do and what does exit code N mean?"
- `runtime-reference.md` — "What does `tsc_str_replace_regex` take and return?"
- `testing.md` — "How do I add a test for a new feature?"
- `done.md` — "Can I use feature X today?"
- `todo.md` — "Is feature X planned? Roughly when?"
- `CHANGELOG.md` — "When did this feature land?"

None of these duplicate the top-level README's quick start. The README is for orientation; the docs here are for execution.
