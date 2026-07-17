const localA: symbol = Symbol("local");
const localB: symbol = Symbol("local");
const globalA: symbol = Symbol.for("shared");
const globalB: symbol = Symbol.for("shared");
const iter: symbol = Symbol.iterator;
const asyncIter: symbol = Symbol.asyncIterator;
const spreadable: symbol = Symbol.isConcatSpreadable;
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("local eq:", localA === localB);
console.log("global eq:", globalA === globalB);
console.log("key:", Symbol.keyFor(globalA));
console.log("local key missing:", Symbol.keyFor(localA) === undefined);
console.log("desc:", localA.description);
console.log("missing desc:", Symbol().description === undefined);
console.log("string:", localA.toString(), Symbol().toString());
console.log("typeof:", typeof localA);
console.log("iterator:", iter === Symbol.iterator, iter.description);
console.log("async:", asyncIter === Symbol.asyncIterator, asyncIter.description);
console.log("spreadable:", spreadable === Symbol.isConcatSpreadable, spreadable.description);

const ignoredDesc = Symbol(mark("d"), mark("x"));
const undefinedDesc = Symbol(undefined, mark("u"));
const ignoredGlobal = Symbol.for(mark("f"), mark("g"));
console.log("ignored desc:", ignoredDesc.description, undefinedDesc.description === undefined, Symbol.keyFor(ignoredGlobal, mark("k")));
console.log("ignored methods:", ignoredDesc.toString(mark("t")), ignoredDesc.toLocaleString(mark("l")), ignoredDesc.valueOf(mark("v")) === ignoredDesc, seen);
