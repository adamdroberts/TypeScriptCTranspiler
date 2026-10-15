const executeSource: any = eval;
const arrayText: any = Array.prototype.toString;
const prototype: any = Array.prototype;
console.log("array:" + executeSource(["17;"].toString()));
console.log("borrowed:" + executeSource(arrayText.call({join() { return "19;"; }})));
console.log("raw:" + executeSource(arrayText.call({join() { return 23; }})));
console.log("fallback:" + arrayText.call({join: 0}));
console.log("metadata:" + prototype.map.name + ":" + prototype.map.length + ":" + typeof prototype.map);
console.log("absent:" + (prototype.then === undefined));
Object.defineProperty(Number.prototype, "join", {configurable: true, get: function(this: any) {
    "use strict";
    if (typeof this !== "object") throw "getter receiver";
    return function(this: any) { "use strict"; return typeof this === "object" ? "31;" : "37;"; };
}});
console.log("boxed:" + executeSource(arrayText.call(17)));
delete (Number.prototype as any).join;
["x"].forEach(function() { console.log("callback:" + executeSource("41;")); });
console.log("complete");
