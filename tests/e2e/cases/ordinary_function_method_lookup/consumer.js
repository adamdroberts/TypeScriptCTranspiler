"use strict";
const holder = { tag: "ordinary", call(...values) { return this.tag + ":" + values.join(","); }, apply(...values) { return this.tag + ":" + values.join(","); }, bind(...values) { return this.tag + ":" + values.join(","); } };
console.log(holder.call("call", 1), holder.apply("apply", 2), holder.bind("bind", 3));
const methodTrace = [], snapshot = {};
Object.defineProperty(snapshot, "call", { configurable: true, get() { methodTrace.push("get"); return function (value) { return this === snapshot && value === 13; }; } });
function argument() { methodTrace.push("argument"); Object.defineProperty(snapshot, "call", { value: null, configurable: true }); return 13; }
console.log("snapshot:", snapshot.call(argument()), methodTrace.join(","));
