function identity<T>(x: T): T {
    const y: T = x;
    return y;
}

function singleton<T>(x: T): T[] {
    const out: T[] = [x];
    return out;
}

function first<T>(xs: T[]): T {
    return xs[0];
}

function second<T>(a: T, b: T): T {
    return b;
}

const n = identity<number>(42);
const s = identity("ok");

const nums = singleton(n);
nums.push(identity(7));

const words = singleton<string>(s);
words.push(identity("done"));

const pair = [10, 11];

console.log("n:", n);
console.log("s:", s);
console.log("first n:", first(nums));
console.log("nums:", nums.join(","));
console.log("first s:", first(words));
console.log("words:", words.join("|"));
console.log("spread:", second<number>(...(pair as [number, number])));
