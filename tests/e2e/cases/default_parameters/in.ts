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

    static tag(prefix: string = "tag"): string {
        return prefix + "!";
    }
}

console.log(greet(), greet("Ada"));
console.log("add:", add(3), add(3, 4));
console.log("factory:", withFactory(), withFactory(), generated);

const first = new Counter();
const second = new Counter("custom", 10);
console.log("first:", first.label, first.value, first.bump(), first.bump(5));
console.log("second:", second.label, second.value, second.bump());
console.log("static:", Counter.tag(), Counter.tag("item"));
