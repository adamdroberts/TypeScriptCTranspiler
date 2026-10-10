Ordinary function bodies, Blocks and CaseBlocks now lower admitted local class declarations through the same class-definition factory as expressions. The canonical direct declaration collection supplies mutable outer value/root/TDZ cells; each named definition owns a separate immutable inner cell, initialized after element keys and retained by method closures. JavaScript transient self-reference Symbols resolve to the declaration's binding. Public methods/accessors retain actual keys, captured values, strict receivers and fresh identities. The separate empty-switch-class factory is deleted; unrepresented initialization elements fail closed with `class element requires the canonical initialization plan`. `tests/property/lexical-class-definition.property.test.ts` compares independent Node scope/capture, inner-name mutation, TDZ, abrupt/protected definitions, repeated evaluation and one deep retained lexical-class input in typed/erased CLI and native observation profiles with both memory modes. `lexical_class_definition` covers imported typed consumers; `lexical_class_initialization_diagnostic` preserves the shared boundary. Existing CType, declaration and runtime APIs suffice. Local constructor bodies/fields/static blocks/heritage/private state, direct resumable class-definition contexts, complete eval/HomeObject/super semantics and eligible full target coverage remain open.

Class declarations and admitted class expressions now share one source-ordered class-element definition algorithm. Computed keys pass through the same ToPropertyKey and callable-name kernels; declaration field keys remain retained for initialization, while expression method/accessor keys belong to the current definition. Callable values receive decoded roots before name or descriptor allocation. The separate method-only expression vector and definition loop are deleted. Class expressions now admit public methods/getters/setters with actual String/Symbol keys, strict receivers, captures and ordinary descriptors; accessor-definition failures throw TypeError. Purity checks preserve the observable failure of replacing a constructor's protected prototype instead of silently pruning it, and unrepresented local environments fail closed. `tests/property/class-expression-elements.property.test.ts` compares independent Node key/coercion/order, function-kind metadata, fresh identity, actual formals/receivers, accessor merging, abrupt/protected descriptors and one deep retained element-owner input across typed/erased CLI and native observation hosts in both memory modes. `tests/e2e/cases/class_expression_elements` covers an imported typed consumer, with `class_expression_initialization_diagnostic` preserving the unsupported initialization boundary. Class-expression constructor bodies/fields/static blocks/heritage, private and complete local/lexical-class/HomeObject/eval contexts and eligible full target coverage remain open.

Public computed instance fields in admitted source class declarations now use the ordered class-member tree, retained evaluated keys and declaration-owned value cells. The native storage projection allocates collision-free cells independently of public String/Symbol keys, so distinct runtime keys cannot share an inferred-name slot; repeated actual keys still follow ordinary own-data definition order. The old computed-name inference gate is deleted. Field initialization, callable name inference, inherited-prefix layout and decoded roots use the existing kernels. Native projections of source class spreads read the ordinary owner rather than inferred physical spellings. `tests/property/computed-instance-field-key.property.test.ts` compares independent Node results for key coercion/order, fresh values, names/descriptors, uninitialized fields, mutation, repeated definitions, inherited setters, derived layout, abrupt completion, spread and one deep retained class-field input across typed/erased CLI and native observation hosts in both memory modes. `tests/e2e/cases/computed_instance_field_key` covers imported typed owners. Private fields, complete class-expression/local/heritage and lexical-class/TDZ contexts, initializer eval/HomeObject semantics, constructor activation details and eligible full target coverage remain open.

Computed static fields now participate in the same source-ordered class-element key pass as methods and accessors. Each computed expression undergoes ToPropertyKey once, and its retained String/Symbol carrier survives until the later field definition. All element keys evaluate before static field values and blocks. Anonymous field callables use the shared runtime name kernel with the evaluated key, preserving explicit names and existing references. `tests/property/computed-class-field-key.property.test.ts` compares independent Node results for coercion, key/value order, mutation, Symbol descriptions, name descriptors, abrupt completion and one deep class-element/owner stress input across typed/erased CLI and native observation hosts in both memory modes. `tests/e2e/cases/computed_class_field_key` exercises an imported typed owner. The null computed-field key crash is removed. Dynamic instance keys, broader class expressions, early eval/HomeObject/private contexts and eligible full target coverage remain open.

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
