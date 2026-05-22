let seen = "";

function mark(label: string, value: any): any {
    seen += label;
    return value;
}

function scale(this: any, value: number, index: number): number {
    return value * (this.factor as number) + index;
}

const scaled = Array.from([2, 4], scale, mark("a", { factor: 3 }));
console.log("typed:", scaled.join(","));

const chars = Array.from("ab", function (this: any, value: string, index: number): string {
    return value + (this.suffix as string) + index;
}, mark("b", { suffix: "!" }));
console.log("string:", chars.join(","));

const dyn: any = [1, 2];

function dynMap(this: any, value: any, index: number): any {
    return (value as number) + (this.offset as number) + index;
}

const dynamic = Array.from(dyn, dynMap, mark("c", { offset: 10 }));
console.log("dynamic:", dynamic[0], dynamic[1], seen);
