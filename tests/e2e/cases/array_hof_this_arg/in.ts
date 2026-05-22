let seen = "";

function mark(label: string, value: any): any {
    seen += label;
    return value;
}

const nums = [1, 2, 3, 4];

function overLimit(this: any, value: number): boolean {
    return value > (this.min as number);
}

console.log("typed find:", nums.find(overLimit, mark("a", { min: 2 })));

const filtered = nums.filter(function (this: any, value: number, index: number, array: number[]): boolean {
    return value > (this.min as number) && index < array.length;
}, mark("b", { min: 2 }));
console.log("typed filter:", filtered.join(","));

const mapped = nums.map((value) => value * 2, mark("c", { unused: true }));
console.log("typed map ignored:", mapped.join(","), seen);

const dyn: any = [1, 2, 3];

function dynOver(this: any, value: any): boolean {
    return (value as number) > (this.min as number);
}

const dynFound: any = dyn.find(dynOver, mark("d", { min: 1 }));
const dynMapped: any = dyn.map(function (this: any, value: any): any {
    return (value as number) + (this.offset as number);
}, mark("e", { offset: 10 }));
const dynSome: any = dyn.some((value: any) => value === 2, mark("f", { unused: true }));

console.log("dyn:", dynFound, dynMapped[0], dynMapped[2], dynSome, seen);
