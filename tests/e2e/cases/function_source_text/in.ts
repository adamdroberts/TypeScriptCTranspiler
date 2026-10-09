import imported, { arrow, Plain } from "./definitions.js";
const created: any = Function("value", "/* body */ return value;");
const expected = "function anonymous(value\n) {\n/* body */ return value;\n}";
console.log("source:", created.toString() === expected, String(created) === expected);
const bound: any = created.bind(null);
Object.defineProperty(created, "name", { get: function() { throw new Error("name getter"); }, configurable: true });
console.log("internal:", Function.prototype.toString.call(created) === expected);
const builtin: any = Object.keys;
Object.defineProperty(builtin, "name", { get: function() { throw new Error("builtin name getter"); }, configurable: true });
console.log("builtin:", Function.prototype.toString.call(builtin));
console.log("opaque:", Function.prototype.toString.call(bound).includes("[native code]"));
try { Function.prototype.toString.call(1); } catch (error) { console.log("error:", error instanceof TypeError); }
console.log("module spans:", String(imported) === "function /* a */ named(value) { return value; }", String(arrow) === "( /* a */ value /* b */ ) /* c */ => value + 1");
console.log("class spans:", String(Plain) === "class Plain { static /* outside */ method /* a */ () { return 7; } }", String(Plain.method) === "method /* a */ () { return 7; }");
