let calls = 0;

function mark(value: number): number {
    calls = calls * 10 + value;
    return value;
}

const value = (mark(1), mark(2));
console.log("value:", value, calls);

const text = (mark(3), "ok");
console.log("text:", text, calls);

console.log("nested:", (mark(4), mark(5), mark(6)), calls);
