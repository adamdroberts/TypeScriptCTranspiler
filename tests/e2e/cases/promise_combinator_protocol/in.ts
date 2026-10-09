const constructor: any = Promise;
const originalAll = constructor.all;
Object.defineProperty(constructor, "all", { configurable: true, get() {
    console.log("combinator getter");
    return originalAll;
} });
const unused = Promise.all([]);
Object.defineProperty(constructor, "all", { value: originalAll, writable: true, configurable: true });
const values = new Set<number>([3, 5]);
Promise.all(values).then((items: number[]) => {
    console.log("numbers", items.join(","));
});
const words = new Set<string>(["first", "second"]);
Promise.all(words).then((items: string[]) => {
    console.log("words", items.join(","));
});
async function consume(): Promise<void> {
    const items = await Promise.all(words);
    console.log("awaited", items.join(","));
    const arrays = await Promise.all([Promise.resolve(["nested"])]);
    console.log("nested", arrays[0].join(","));
    const first = await Promise.race(new Set([Promise.resolve("winner")]));
    console.log("race", first);
}
consume();
const input = new Map<string, number>([["key", 11]]);
Promise.all(input).then((items: [string, number][]) => {
    console.log("entry", items[0][0], items[0][1]);
});
class Words {
    items: string[];
    constructor(items: string[]) { this.items = items; }
    [Symbol.iterator](): ArrayIterator<string> {
        return this.items.values();
    }
}
class MoreWords extends Words {
    constructor(items: string[]) { super(items); }
}
Promise.all(new MoreWords(["class", "iterable"])).then((items: string[]) => {
    console.log("class", items.join(","));
});
