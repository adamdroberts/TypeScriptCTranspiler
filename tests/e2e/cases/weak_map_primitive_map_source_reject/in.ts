const source = new Map<string, number>();
const empty = new WeakMap<object, number>(source as any);
console.log("empty source:", empty instanceof WeakMap);
source.set("invalid", 1);
let caught = false;
try { new WeakMap<object, number>(source as any); } catch (error) { caught = error instanceof TypeError; }
console.log("invalid source:", caught);
