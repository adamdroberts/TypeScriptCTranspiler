# CLI reference

`tsc2c` — the command-line frontend.

## Synopsis

```
tsc2c <entry.ts> [options]
```

Exactly one positional argument: the entry `.ts` file. All imports reachable from the entry are compiled transparently; no need to list them.

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output <path>` | `a.out` | Output binary path. Parent directory must exist. |
| `--emit-c-only` | `false` | Skip the gcc step. Write generated C into the build dir and return. Useful for inspecting what the emitter produced. |
| `--keep-build-dir <path>` | tempdir | Use this directory for intermediate `main.c` + `tsc_runtime.c`/`.h`. Created if absent; not cleaned up. Without this flag a temp dir is created and kept (its path is printed under `--verbose`). |
| `--no-gc` | `false` | Compile with `-DTSC_NO_GC`. The runtime swaps Boehm GC for a leaking `calloc` fallback. For short-lived programs or envs without `libgc-dev`. **Do not ship production binaries with this flag.** |
| `--release` | `false` | Link a smaller release binary using gcc `-Os -s` instead of the default `-O2`; on Linux, release builds also compile with section flags and link with section garbage collection. |
| `--unsafe-eval` | `false` | Allow unknown runtime `eval(...)` / `Function(...)` strings through the embedded Node bridge. Requires `libnode` link inputs. |
| `--runtime-code-manifest <path>` | — | JSON allow list for non-constant runtime code strings that should still compile AOT. Shape: `{ "eval": ["1 + 2"], "functions": ["return 42;"] }` or named maps like `{ "eval": { "sum": "1 + 2" } }`. |
| `--dynamic-require-manifest <path>` | — | JSON allow list for non-finite `require(variable)` sites. Shape: `{ "requires": ["./specifier"] }`, `{ "requires": { "name": "./specifier" } }`, or caller-scoped maps such as `{ "requires": { "src/loader.ts": ["./specifier"] } }`; caller-scoped keys resolve relative to the manifest and match exact normalized absolute source-file paths. |
| `--native-addon-manifest <path>` | — | JSON allow list mapping native addon specifiers to concrete `.node` files for the embedded Node bridge. |
| `--allow-net <hosts>` | unrestricted | Compile a network allowlist into the binary. Entries are comma-separated and the flag may repeat: `host`, `host:port`, `[ipv6]`, `[ipv6]:port`, or a bare IPv6 address; no port means any port. Hosts are LDH DNS names (no wildcards; names libc would parse as numeric addresses such as `127.1` are rejected) or IP literals. `--allow-net=` with no entries denies all networking. See [Network allowlist](#network-allowlist). Cannot be combined with the embedded Node bridge. |
| `--verbose` | `false` | Print the build dir, each output file, and the full gcc command line. |
| `-h, --help` | — | Standard commander help. |
| `-V, --version` | — | Print `0.0.1`. |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success. Binary written to `--output` (or C written to build dir with `--emit-c-only`). |
| `1` | gcc failed. Its stderr is forwarded before this message: `tsc2c: gcc exited <N>`. |
| `2` | TypeScript type-check failed. Full `ts.formatDiagnosticsWithColorAndContext` output is printed before exit. |
| `3` | Emitter rejected the program because it uses an unsupported TS feature. A `file:line:col: unsupported: <reason>` line is printed before exit. |

The three failure codes are distinct so CI / test harnesses can categorize failures.

## Network allowlist

With `--allow-net`, every DNS query, reverse lookup, `connect`, and `bind`/`listen` in the produced binary passes one runtime chokepoint (`tsc_net_guarded_*` in `runtime/tsc_node.c`; the raw libc entry points are `#pragma GCC poison`ed after it so no call site can bypass it). The rules:

- A host name may be resolved only when an entry names it (ASCII case-insensitive, one trailing dot ignored). IP literals compare by address, so `::ffff:127.0.0.1` matches `127.0.0.1`.
- A socket may connect to or bind an address only when an IP entry names it, or a permitted resolution of an entry's host produced it, and the port matches that entry (or the entry has no port). Allowing `example.com:443` therefore permits its resolved addresses on port 443 only.
- Wildcard bind addresses are ordinary addresses: listening without a host or on `0.0.0.0`/`::` needs an entry for that address.
- A denial throws an `Error` with `code: "ERR_ACCESS_DENIED"`, `permission: "Net"`, `resource: "<host or address[:port]>"` and Node's permission-model message, before any packet or query leaves the process.

Child processes are separate programs and are not covered; restrict them with OS sandboxing if needed. Without `--allow-net` networking is unrestricted, as in Bun.

## Environment variables

| Variable | Read by | Effect |
|----------|---------|--------|
| `TSC2C_CC` | compiler driver | C compiler command for generated C and C runtime sources. Defaults to `gcc`; CI also exercises `clang`. |
| `TSC2C_CXX` | compiler driver | C++ compiler/linker command when embedded-Node bridge sources are present. Defaults to `g++`; CI also exercises `clang++`. |
| `TSC2C_NO_GC` | `tests/e2e/run.ts` | If `=1`, the harness passes `--no-gc` to every compile. Lets you run the suite without `libgc-dev` installed. |
| `TMPDIR` | runtime (inside produced binaries) | Used by `os.tmpdir()`. Falls back to `/tmp`. |
| `HOME` | runtime | Used by `os.homedir()`. Falls back to `/`. |
| (any) | runtime | Exposed via `process.env.VAR` inside the TS program. |

## Examples

Compile + run a single file:

```bash
./bin/tsc2c examples/hello.ts -o /tmp/hello
/tmp/hello
# hello, world!
```

Compile an existing example and keep the C for inspection:

```bash
./bin/tsc2c examples/fizzbuzz.ts -o /tmp/fb --keep-build-dir /tmp/fb-build --verbose
cat /tmp/fb-build/main.c | head -30
```

Check type errors without invoking gcc:

```bash
./bin/tsc2c broken.ts -o /tmp/out --emit-c-only
echo "tsc2c exit: $?"
```

## How `bin/tsc2c` finds the implementation

`bin/tsc2c` is a POSIX shell script that dispatches in this order:

1. If `bun` is on `PATH` and `src/cli.ts` exists, run `bun src/cli.ts "$@"`.
2. Else if `dist/cli.js` exists (from `bun run build`), run `node dist/cli.js "$@"`.
3. Else print a setup-required error and exit 1.

So for normal development (bun installed): no build step needed. For shipped/packaged use: run `bun run build` first.

## Inside the pipeline

When you run `tsc2c foo.ts`, the CLI's `action()` handler:

1. Builds a `CompileOptions` struct from the flags.
2. Calls `compile({ entry, output, ... })` from `src/compile.ts`.
3. Inside `compile()`:
   - `buildProgram()` wraps `ts.createProgram` with our `stdlib/lib.core.d.ts` as a root file.
   - `ts.getPreEmitDiagnostics()` runs the type check. Any diagnostic → exit 2.
   - `buildModuleGraph()` walks imports, produces topo order.
   - `emitProgram(graph, checker)` produces a single `mainC` string.
   - Runtime files are copied into the build dir.
   - `invokeCc()` in `src/link/cc.ts` spawns gcc.
4. The CLI calls `process.exit(result.exitCode)` so the shell gets the right code.

See [`architecture.md`](architecture.md) for the diagram.
