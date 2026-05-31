import { allowedNodeEnvironmentFlags as namedFlags } from "process";
import * as proc from "node:process";
import defaultProcess from "process";

// 1. Global process
const globalFlags = process.allowedNodeEnvironmentFlags;
console.log("global size:", globalFlags.size);
console.log("global has --require:", globalFlags.has("--require"));
console.log("global has --inspect:", globalFlags.has("--inspect"));
console.log("global has --invalid:", globalFlags.has("--invalid"));

// 2. Named import
console.log("named size:", namedFlags.size);
console.log("named has --loader:", namedFlags.has("--loader"));

// 3. Namespace import
const nsFlags = proc.allowedNodeEnvironmentFlags;
console.log("namespace size:", nsFlags.size);
console.log("namespace has --inspect-brk:", nsFlags.has("--inspect-brk"));

// 4. Default import
const defFlags = defaultProcess.allowedNodeEnvironmentFlags;
console.log("default size:", defFlags.size);
console.log("default has --enable-source-maps:", defFlags.has("--enable-source-maps"));

// 5. Check all expected items
const expected = ["--inspect", "--inspect-brk", "--require", "--loader", "--enable-source-maps"];
for (const flag of expected) {
    console.log(`has ${flag}:`, globalFlags.has(flag));
}
