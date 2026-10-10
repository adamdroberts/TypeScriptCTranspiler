const source = new Set<string>();
const empty = new WeakSet<object>(source as any);
console.log("empty source:", empty instanceof WeakSet);
source.add("invalid");
let caught = false;
try { new WeakSet<object>(source as any); } catch (error) { caught = error instanceof TypeError; }
console.log("invalid source:", caught);
