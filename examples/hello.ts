// Minimal end-to-end: TypeScript source → C → gcc → native binary.
// Compile: ./bin/tsc2c examples/hello.ts -o /tmp/hello
// Run:     /tmp/hello
console.log("Hello from TypeScriptC!");
console.log("This is a native Linux binary — no Node runtime required.");
