function joinWords(prefix: string, ...words: string[]): string {
    console.log("count:", words.length);
    return prefix + words.join("-");
}

function sum(...nums: number[]): number {
    let total = 0;
    for (const n of nums) {
        total += n;
    }
    return total;
}

function pairLabel(a: number, b: number): string {
    return "pair:" + (a + b);
}

function wrap3(a: string, b: string, c: string): string {
    return a + "|" + b + "|" + c;
}

class Bag {
    addAll(label: string, ...items: string[]): string {
        return label + ":" + items.join(",");
    }
}

class PairOps {
    static add(a: number, b: number): number {
        return a + b;
    }

    combine(a: string, b: string): string {
        return a + b;
    }
}

const base = ["a", "b"];
const more = [3, 4];
const pair = [6, 7];
const dynamicPair: any = [8, 9];
const ops = new PairOps();

console.log(joinWords("x:", ...base, "c"));
console.log("sum:", sum(1, 2, ...more, 5));
console.log(pairLabel(...(pair as [number, number])));
console.log(pairLabel(...(dynamicPair as [number, number])));
console.log(wrap3("x", ...(base as [string, string])));
console.log("static:", PairOps.add(...(pair as [number, number])));
console.log("method:", ops.combine(...(base as [string, string])));
console.log(new Bag().addAll("bag", ...base));
