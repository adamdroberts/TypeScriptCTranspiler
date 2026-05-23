function tick(this: any, label: string): void {
    console.log("tick:", typeof this, label);
}

function micro(this: any): void {
    console.log("micro:", typeof this);
}

function timeout(this: any, label: string, count: number): void {
    console.log("timeout:", typeof this, label, count);
}

function immediate(this: any, label: string): void {
    console.log("immediate:", typeof this, label);
}

process.nextTick(tick, "next");
queueMicrotask(micro);
setTimeout(timeout, 0, "timer", 2);
setImmediate(immediate, "soon");
console.log("sync");
