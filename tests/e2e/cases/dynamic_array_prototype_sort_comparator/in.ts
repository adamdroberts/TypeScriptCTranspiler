function descNumber(left: any, right: any): number {
    return Number(right) - Number(left);
}

const proto: any = Array.prototype;
const sort: any = proto.sort;
const toSorted: any = proto.toSorted;

const values: any = [3, 10, 2];
const sorted: any = Reflect.apply(sort, values, [descNumber]);
console.log("sort comparator:", sorted === values, values.join("|"));

const source: any = [3, 10, 2];
const copy: any = Reflect.apply(toSorted, source, [(left: any, right: any) => Number(left) - Number(right)]);
console.log("toSorted comparator:", copy.join("|"), source.join("|"));

const arrayLike: any = { 0: "bbb", 1: "a", 2: "cc", length: 3 };
Reflect.apply(sort, arrayLike, [(left: any, right: any) => String(left).length - String(right).length]);
console.log("array-like comparator:", arrayLike[0], arrayLike[1], arrayLike[2]);

try {
    Reflect.apply(sort, [1, 2] as any, [null as any]);
} catch (err) {
    console.log("bad comparator:", String(err));
}

const badComparatorReceivers: any = [
    ["empty array", [] as any],
    ["single array", ["solo"] as any],
    ["empty like", { length: 0 } as any],
    ["single like", { 0: "solo", length: 1 } as any],
];
for (const entry of badComparatorReceivers) {
    const label: string = entry[0];
    const receiver: any = entry[1];
    try {
        Reflect.apply(sort, receiver, [5 as any]);
    } catch (err) {
        console.log(label + " sort bad:", String(err));
    }
    try {
        Reflect.apply(toSorted, receiver, [5 as any]);
    } catch (err) {
        console.log(label + " toSorted bad:", String(err));
    }
}
