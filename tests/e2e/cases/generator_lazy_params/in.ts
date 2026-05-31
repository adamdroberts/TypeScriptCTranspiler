function* lazyParams(label: string, start: number, step: number): Generator<number, string, undefined> {
    console.log(label + " start " + start);
    yield start;
    console.log(label + " after first");
    yield start + step;
    console.log(label + " after second");
    yield start + step + step;
    return label + " done";
}

class Box {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    *labels(prefix: string): Generator<string, string, undefined> {
        console.log(prefix + " method start " + this.value);
        yield prefix + ":" + this.value;
        console.log(prefix + " method after first");
        yield prefix + ":" + (this.value + 1);
        return prefix + " method done";
    }
}

console.log("--- parameterized generator ---");
const g = lazyParams("P", 10, 5);
console.log("parameterized generator initialized");
const first = g.next();
console.log("first:", first.done, first.value);
const mapped = (g as any).map((value: number): number => value + 1);
console.log("mapped:", mapped.join(", "));
const second = g.next();
console.log("second:", second.done, second.value);

console.log("--- method generator ---");
const methodGen = new Box(7).labels("M");
console.log("method generator initialized");
const methodFirst = methodGen.next();
console.log("method first:", methodFirst.done, methodFirst.value);
const methodSecond = methodGen.next();
console.log("method second:", methodSecond.done, methodSecond.value);
