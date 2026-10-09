function borrow(values: string[]): any { return values; }
function change(values: string[]): any { values[0] = "changed"; values.push("added"); return values; }
const source: string[] = ["first"], boxed: any = source;
console.log(Object.is(borrow(boxed), boxed));
const returned = change(boxed);
console.log(Object.is(returned, boxed), source[0], boxed[0], source.length);
const ordinary: any[] = ["raw"], alias: any = ordinary;
const adapted = change(ordinary);
console.log(Object.is(adapted, alias), ordinary[0], alias.length);
const getter: any[] = [];
let reads = 0;
Object.defineProperty(getter, "0", { get() { reads++; return "getter"; } });
const preserved = borrow(getter);
console.log(reads, preserved[0], reads);
const frozen: any[] = ["fixed"];
Object.freeze(frozen);
console.log(Object.is(borrow(frozen), frozen), Object.isFrozen(frozen));
