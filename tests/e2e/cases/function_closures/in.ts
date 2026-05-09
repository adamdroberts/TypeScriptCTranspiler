function makeAdder(base: number): (x: number) => number {
    const offset = 2;
    return (x: number) => x + base + offset;
}

function makeCounter(start: number): () => number {
    let n = start;
    return () => {
        n = n + 1;
        return n;
    };
}

function applyTwice(fn: (x: number) => number, value: number): number {
    return fn(fn(value));
}

function inc(x: number): number {
    return x + 1;
}

const add7 = makeAdder(5);
console.log("add7:", add7(10));

const counter = makeCounter(3);
console.log("counter:", counter(), counter(), counter());

console.log("twice closure:", applyTwice(add7, 1));
console.log("twice declared:", applyTwice(inc, 10));
