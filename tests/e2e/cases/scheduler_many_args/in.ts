const seen: string[] = [];
const remaining = new Set(["tick", "timeout", "immediate"]);
function done(name: string): void {
    remaining.delete(name);
    if (remaining.size === 0) console.log(seen.sort().join("|"));
}

function tick(this: any, a: string, b: number, c: boolean, d: string, e: number, f: string): void {
    seen.push(["tick", typeof this, a, String(b), String(c), d, String(e), f].join(":"));
    done("tick");
}

function timeout(this: any, a: string, b: number, c: boolean, d: string, e: number, f: string): void {
    seen.push(["timeout", typeof this, a, String(b), String(c), d, String(e), f].join(":"));
    done("timeout");
}

function immediate(this: any, a: string, b: number, c: boolean, d: string, e: number, f: string): void {
    seen.push(["immediate", typeof this, a, String(b), String(c), d, String(e), f].join(":"));
    done("immediate");
}

process.nextTick(tick, "a", 1, true, "d", 5, "g");
setTimeout(timeout, 0, "b", 2, false, "e", 6, "h");
setImmediate(immediate, "c", 3, true, "f", 7, "i");

console.log("sync");
