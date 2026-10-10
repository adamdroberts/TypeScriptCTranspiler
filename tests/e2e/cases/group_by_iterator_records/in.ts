interface Item { id: number; }
function check(value: boolean, label: string): void {
    if (!value) throw new Error(label);
    console.log(label);
}

const items: Item[] = [{id: 1}, {id: 2}];
const original: Item = items[0]!;
const groups = Map.groupBy(items, (item, index) => {
    if (index === 0) items.push({id: 3});
    return item.id % 2;
});
const odd = groups.get(1)!;
check(odd.length === 2 && odd[0] === original && odd[1] === items[2], "live native objects");
const boxed: any = original;
Object.defineProperty(boxed, "retained", {value: true});
const again = Object.groupBy(items, (item, index) => {
    const current: any = item;
    if (index === 0) check(current === boxed && current.retained, "retained native descriptor");
    return "all";
}) as any;
check(again.all[0] === boxed && Object.getPrototypeOf(again) === null, "object group identity");

class Base { id: number = 4; }
class Derived extends Base { extra: number = 7; }
const derived = new Derived();
const bases: Base[] = [derived];
const baseGroups = Map.groupBy(bases, value => value.id);
const baseBox: any = baseGroups.get(4)![0]!;
const derivedBox: any = derived;
check(baseBox === derivedBox && baseBox.extra === 7, "actual derived owner");

const sourceMap = new Map<string, number>([["first", 1], ["second", 2]]);
const seen: any[] = [];
const entries = Map.groupBy(sourceMap, (entry, index) => {
    seen.push(entry);
    if (index === 0) {
        const mutable: any = entry;
        mutable[1] = 20;
        sourceMap.set("later", 3);
    }
    return "all";
}).get("all")!;
check(entries.length === 3 && entries[0] === seen[0] && entries[0]![1] === 20, "live map entry identity");
seen[0][0] = "changed";
seen[0][1] = 90;
check(entries[0]![0] === "changed" && entries[0]![1] === 90, "pair alias mutation");
const copied = new Map<string, number>(entries);
check(copied.get("changed") === 90 && copied.get("later") === 3 && sourceMap.get("first") === 1, "pair constructor reads");

const symbol = Symbol("group");
const symbolGroups = Object.groupBy([1, 2], () => symbol) as any;
check(symbolGroups[symbol].join("|") === "1|2", "symbol property key");
const zeroGroups = Map.groupBy([-0, 0, NaN, NaN], value => value);
check(zeroGroups.size === 2 && zeroGroups.get(0)!.length === 2 && zeroGroups.get(NaN)!.length === 2, "canonical numeric keys");
const nullGroups = Map.groupBy([1, 2], () => null);
const missingGroups = Map.groupBy([1, 2], () => undefined);
const voidGroups = Map.groupBy([1, 2], () => {});
check(nullGroups.get(null)!.length === 2 && missingGroups.get(undefined)!.length === 2 && voidGroups.get(undefined)!.length === 2, "tagged nullish keys");
const absent: undefined[] = [undefined, undefined];
const absentGroups = Map.groupBy(absent, () => "all");
check(absentGroups.get("all")!.length === 2 && absentGroups.get("all")![0] === undefined, "tagged nullish elements");
const large = BigInt("9007199254740993");
const integerGroups = Map.groupBy([large, BigInt("9007199254740993")], value => value);
check(integerGroups.size === 1 && integerGroups.get(BigInt("9007199254740993"))!.length === 2, "bigint key equality");
const keyFunction = () => 7;
const functionGroups = Map.groupBy([1, 2], () => keyFunction);
check(functionGroups.size === 1 && functionGroups.get(keyFunction)!.length === 2, "callable key identity");

let trace = "";
let position = 0;
const iterator: any = {
    next() { trace += "next;"; return {done: position === 3, value: position++}; },
    return() { trace += "close;"; throw "cleanup"; }
};
const iterable: any = {[Symbol.iterator]() { trace += "open;"; return iterator; }};
const raw: any = {original: true};
try {
    Map.groupBy(iterable, (value: any, index: number) => {
        trace += "callback;";
        if (index === 1) throw raw;
        return "all";
    });
} catch (error) { check(error === raw, "original callback throw"); }
check(trace === "open;next;callback;next;callback;close;", "captured iterator close order");
