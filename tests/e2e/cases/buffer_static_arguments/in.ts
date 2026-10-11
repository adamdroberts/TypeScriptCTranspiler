let trace = "";
function mark(label: string, value: any): any { trace += label; return value; }
const size = 2 * 3 + 0.75;
const allocated = Buffer.alloc(size, 64 + 1);
console.log("computed:", allocated.length, allocated.toString());
const pattern = Buffer.alloc(5, Buffer.from("ab"));
console.log("pattern:", pattern.toString());
const parts: Buffer[] = [Buffer.from("ab"), Buffer.from("cd")];
console.log("concat:", Buffer.concat(parts).toString(), Buffer.concat(parts, 1 + 2).toString(), Buffer.concat(parts, 3 * 2).toString("hex"));
try { Buffer.alloc(mark("size|", "3"), mark("fill|", 2), ...[mark("encoding|", "hex"), mark("extra|", 7)]); }
catch (error: any) { console.log("invalid:", error instanceof TypeError, error.code, trace); }
let reads = 0;
const changed: Buffer[] = [];
Object.defineProperty(changed, "0", { get() { reads++; return Buffer.from(reads === 1 ? "ab" : "c"); }, configurable: true });
console.log("changed:", Buffer.concat(changed).toString("hex"), reads);
console.log("zero:", Buffer.concat([], "ignored" as any).length, Buffer.alloc(0, Symbol("ignored")).length);
