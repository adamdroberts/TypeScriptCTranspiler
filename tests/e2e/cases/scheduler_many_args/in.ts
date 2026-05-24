const seen: string[] = [];

function tick(this: any, a: string, b: number, c: boolean, d: string, e: number): void {
    seen.push(["tick", typeof this, a, String(b), String(c), d, String(e)].join(":"));
}

function timeout(this: any, a: string, b: number, c: boolean, d: string, e: number): void {
    seen.push(["timeout", typeof this, a, String(b), String(c), d, String(e)].join(":"));
}

function immediate(this: any, a: string, b: number, c: boolean, d: string, e: number): void {
    seen.push(["immediate", typeof this, a, String(b), String(c), d, String(e)].join(":"));
}

process.nextTick(tick, "a", 1, true, "d", 5);
setTimeout(timeout, 0, "b", 2, false, "e", 6);
setImmediate(immediate, "c", 3, true, "f", 7);

setImmediate(() => {
    console.log(seen.join("|"));
});

console.log("sync");
