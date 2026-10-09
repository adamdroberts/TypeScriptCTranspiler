const numbers: number[] = [1];
let total = 0;
for (const value of numbers) {
    total += value;
    if (value === 1) numbers.push(2);
}
console.log("live:", total);
Object.defineProperty(numbers, Symbol.iterator, {
    value() { return ["x", "y"].values(); }, configurable: true,
});
const selected: string[] = [];
for (const value of numbers) selected.push(String(value));
console.log("override:", selected.join("|"));
const matches: string[] = [];
for (const match of "aba".matchAll(/a/dg)) {
    matches.push(match.index + ":" + match[0] + ":" + match.indices![0]!.join("|"));
}
console.log("matches:", matches.join("/"));
const callbacks: Array<() => string> = [];
const entries: any = [["a", { value: 1 }], ["b", { value: 2 }]];
for (let [key, { value }] of entries) {
    callbacks.push(() => { value++; return key + ":" + value; });
}
console.log("capture:", callbacks.map(callback => callback()).join("|"));
console.log("capture:", callbacks.map(callback => callback()).join("|"));
const protocolEvents: string[] = [];
const iterable: any = { [Symbol.iterator]() {
    let index = 0;
    return {
        next() { protocolEvents.push("next:" + index); return { done: false, value: ++index }; },
        return() { protocolEvents.push("return"); return {}; },
    };
} };
function earlyReturn(): number {
    for (const value of iterable) return value + 8;
    return 0;
}
function earlyVoid(): void {
    for (const value of iterable) { protocolEvents.push("body:" + value); return; }
}
console.log("return:", earlyReturn());
earlyVoid();
console.log("close:", protocolEvents.join("|"));
