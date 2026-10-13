const value = { rows: [1, "17;"], nested: { body: "19;" } };
const restored: any = eval("(" + JSON.stringify(value) + ")");
console.log("nested:", eval(restored.nested.body));
const target: any = {};
Object.defineProperty(target, "hidden", { get() { throw "unreachable"; } });
Object.defineProperty(target, "visible", { enumerable: true, value: 23 });
console.log("descriptor:", JSON.stringify(eval("(" + JSON.stringify(target) + ")")));
let body = "29;";
JSON.stringify({ nested: { get value() { body = "31;"; return 1; } } });
console.log("getter:", eval(body));
try { JSON.stringify({ first: { toJSON() { throw "37;"; } }, get later() { body = "41;"; return 1; } }); } catch (source) { console.log("throw:", eval(source), eval(body)); }
