const sym = Symbol("id");
const same = sym.valueOf();
const big = 255n;
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("sym-locale:", sym.toLocaleString());
console.log("sym-value:", same === sym, same.description);
console.log("big-locale:", big.toLocaleString());
console.log("big-value:", big.valueOf() + 1n);
console.log("own:", sym.hasOwnProperty("description"), big.propertyIsEnumerable("toString"));
console.log("ignored big:", BigInt("255", mark("b")).toString(16, mark("s")), big.toLocaleString(mark("l")), big.valueOf(mark("v")) === big, big.toString(undefined, mark("u")), seen);
console.log("ignored own:", sym.hasOwnProperty("description", mark("h")), big.propertyIsEnumerable("toString", mark("e")), seen);
