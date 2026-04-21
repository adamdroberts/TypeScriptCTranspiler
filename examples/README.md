# Examples

Each file is a standalone TypeScript program that compiles end-to-end to a native Linux binary via `./bin/tsc2c`. Together they cover a representative slice of what the transpiler can handle today.

## Running

```bash
# one-time
bun install
sudo apt-get install -y libgc-dev    # optional — add --no-gc otherwise

# compile any example
./bin/tsc2c examples/hello.ts -o /tmp/hello
/tmp/hello
```

Without `libgc-dev`, add `--no-gc` to the `tsc2c` command (the produced binary will leak on exit but works fine for short-lived programs).

## What each demonstrates

| File                 | Features |
|----------------------|----------|
| `hello.ts`           | Minimal end-to-end pipeline; `console.log` |
| `fizzbuzz.ts`        | `for` / `if` / modulo / string concat |
| `calc.ts`            | `process.argv`, `parseFloat`, `switch` with case fall-through, template literals, `process.exit`, `process.argv`-driven CLI |
| `tree.ts`            | Binary search tree: recursive class methods, `T \| null` fields, mutation of instance state, `Array.forEach` |
| `cart.ts`            | Classes + interfaces + `Array.reduce`/`map`/`filter` + template literals |
| `collections.ts`     | `Map<K,V>`, `Set<T>`, object literals against typed shape, every HOF (`map`/`filter`/`reduce`/`forEach`/`some`/`every`), `String.padEnd` |
| `wordcount.ts`       | Real-world tool: `fs.readFileSync`, regex `split(/[^a-z0-9]+/)`, `Map` for counting, `Array.sort((a,b)=>…)` with comparator, optional CLI arg |

## Try it

```bash
./bin/tsc2c examples/calc.ts -o /tmp/calc && /tmp/calc 12 '*' 3.5
./bin/tsc2c examples/tree.ts -o /tmp/tree && /tmp/tree
./bin/tsc2c examples/collections.ts -o /tmp/coll && /tmp/coll
./bin/tsc2c examples/wordcount.ts -o /tmp/wc && /tmp/wc README.md 5
```

## A note on `process.argv`

In the compiled binary, `argv` follows the C convention — not Node's:

- `process.argv[0]` is the binary's own path (e.g. `/tmp/calc`).
- `process.argv[1]` is the first user argument.

Node prepends `"node"` and the script path because Node is a runtime loading a script. A standalone compiled binary has no such runtime, so those entries don't exist. The `calc.ts` and `wordcount.ts` examples index `argv[1]` onward for user args.
