let generated = 0;

function nextLabel(): string {
    generated += 1;
    return "gen-" + generated;
}

function greet(name: string = "world"): string {
    return "hello " + name;
}

function add(a: number, b: number = 5): number {
    return a + b;
}

function addFromEarlier(a: number, b: number = a + 2): number {
    return a + b;
}

function greetFromEarlier(name: string, message: string = "hello " + name): string {
    return message;
}

function withFactory(label: string = nextLabel()): string {
    return label;
}

class Counter {
    label: string;
    value: number;

    constructor(label: string = "counter", start: number = 1) {
        this.label = label;
        this.value = start;
    }

    bump(delta: number = 2): number {
        this.value += delta;
        return this.value;
    }

    bumpFrom(base: number, delta: number = base + 1): number {
        this.value += delta;
        return this.value;
    }

    static tag(prefix: string = "tag"): string {
        return prefix + "!";
    }

    static combine(left: string, right: string = left + "!"): string {
        return left + ":" + right;
    }
}

class Range {
    start: number;
    end: number;

    constructor(start: number, end: number = start + 3) {
        this.start = start;
        this.end = end;
    }
}

console.log(greet(), greet("Ada"));
console.log("add:", add(3), add(3, 4));
console.log("earlier:", addFromEarlier(4), addFromEarlier(4, 1), greetFromEarlier("Ada"));
console.log("factory:", withFactory(), withFactory(), generated);

const first = new Counter();
const second = new Counter("custom", 10);
console.log("first:", first.label, first.value, first.bump(), first.bump(5));
console.log("second:", second.label, second.value, second.bump(), second.bumpFrom(3));
console.log("static:", Counter.tag(), Counter.tag("item"), Counter.combine("x"));
const range = new Range(5);
console.log("range:", range.start, range.end);
