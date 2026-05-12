const values = new Set<number>([3, 1, 3, 2]);

const copy = Array.from(values);
console.log("copy:", copy.join("|"), copy.length);

const labels = Array.from(values, (value, index) => "s" + index + "=" + value);
console.log("labels:", labels.join("|"));

function scale(value: number, index: number): number {
    return value * 10 + index;
}

const scaled = Array.from(values, scale);
console.log("scaled:", scaled.join("|"));
