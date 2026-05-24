const seen: string[] = [];

function tick(this: any, a: string, b: number, c: boolean, d: string, e: number, f: string): void {
    seen.push(["tick", typeof this, a, String(b), String(c), d, String(e), f].join(":"));
}

function timeout(this: any, a: string, b: number, c: boolean, d: string, e: number, f: string): void {
    seen.push(["timeout", typeof this, a, String(b), String(c), d, String(e), f].join(":"));
}

function immediate(this: any, a: string, b: number, c: boolean, d: string, e: number, f: string): void {
    seen.push(["immediate", typeof this, a, String(b), String(c), d, String(e), f].join(":"));
}

process.nextTick(tick, "a", 1, true, "d", 5, "g");
setTimeout(timeout, 0, "b", 2, false, "e", 6, "h");
setImmediate(immediate, "c", 3, true, "f", 7, "i");

setImmediate(() => {
    console.log(seen.join("|"));
});

console.log("sync");
