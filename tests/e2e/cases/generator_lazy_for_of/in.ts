const events: string[] = [];

function* numbers(): Generator<number, string, number> {
    const values: number[] = [1, 2, 3];
    for (const value of values) {
        events.push("number:" + value);
        if (value === 2) continue;
        yield value;
    }
    return "numbers-done";
}

function* letters(): Generator<string, string, string> {
    for (const letter of "ab") {
        events.push("letter:" + letter);
        yield letter;
        if (letter === "a") break;
    }
    return "letters-done";
}

function* setValues(): Generator<number, string, number> {
    const values: Set<number> = new Set<number>([7, 8]);
    for (const value of values) {
        events.push("set:" + value);
        yield value;
    }
    return "set-done";
}

function* mapValues(): Generator<number, string, number> {
    const values: Map<string, number> = new Map<string, number>();
    values.set("x", 9);
    values.set("y", 10);
    for (const entry of values) {
        events.push("map:" + entry[0] + ":" + entry[1]);
        yield entry[1];
    }
    return "map-done";
}

class NumberBag {
    items: number[];

    constructor(items: number[]) {
        this.items = items;
    }

    [Symbol.iterator](): IterableIterator<number> {
        return this.items as unknown as IterableIterator<number>;
    }
}

function* customValues(): Generator<number, string, number> {
    for (const value of new NumberBag([11, 12])) {
        events.push("custom:" + value);
        yield value;
    }
    return "custom-done";
}

function* paramsValues(): Generator<string, string, string> {
    const params = new URLSearchParams("a=1&b=two");
    for (const entry of params) {
        events.push("params:" + entry[0] + ":" + entry[1]);
        yield entry[0];
    }
    return "params-done";
}

const n = numbers();
console.log("n-created", events.join("|"));
const n1: any = n.next(0);
console.log("n1", n1.done, n1.value, events.join("|"));
const n2: any = n.next(0);
console.log("n2", n2.done, n2.value, events.join("|"));
const n3: any = n.next(0);
console.log("n3", n3.done, n3.value, events.join("|"));

const l = letters();
const l1: any = l.next("ignored");
console.log("l1", l1.done, l1.value, events.join("|"));
const l2: any = l.next("resume");
console.log("l2", l2.done, l2.value, events.join("|"));

const set = setValues();
const set1: any = set.next(0);
console.log("set1", set1.done, set1.value, events.join("|"));
const set2: any = set.next(0);
console.log("set2", set2.done, set2.value, events.join("|"));

const map = mapValues();
const map1: any = map.next(0);
console.log("map1", map1.done, map1.value, events.join("|"));

const custom = customValues();
const custom1: any = custom.next(0);
console.log("custom1", custom1.done, custom1.value, events.join("|"));

const params = paramsValues();
const params1: any = params.next("");
console.log("params1", params1.done, params1.value, events.join("|"));
