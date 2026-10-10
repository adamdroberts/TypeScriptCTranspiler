const remaining = new Set(["tick", "micro", "timeout", "immediate"]);
const completed: string[] = [];
function record(name: string, line: string): void {
    completed.push(line);
    remaining.delete(name);
    if (remaining.size === 0) {
        for (const entry of completed.sort()) console.log(entry);
    }
}

function tick(this: any, label: string): void {
    record("tick", "tick: " + typeof this + " " + label);
}

function micro(this: any): void {
    record("micro", "micro: " + typeof this);
}

function timeout(this: any, label: string, count: number): void {
    record("timeout", "timeout: " + typeof this + " " + label + " " + count);
}

function immediate(this: any, label: string): void {
    record("immediate", "immediate: " + typeof this + " " + label);
}

process.nextTick(tick, "next");
queueMicrotask(micro);
setTimeout(timeout, 0, "timer", 2);
setImmediate(immediate, "soon");
console.log("sync");
