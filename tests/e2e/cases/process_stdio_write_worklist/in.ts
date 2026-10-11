"use strict";
let trace = "";
function completed(this: any, error?: Error | null): void {
    if (this !== undefined || error !== null || arguments.length !== 1) throw "callback contract";
    trace += "write|";
}
const bytes = new ArrayBuffer(0);
const view = new DataView(bytes);
process.stdout.write("v:");
process.stdout.write(view, completed);
process.nextTick(() => { trace += "tick|"; });
process.stdout.write("", completed);
let effects = "";
function mark(label: string, value: any): any { effects += label; return value; }
process.stdout.write(...[mark("a", ""), mark("b", completed), mark("c", 3)]);
console.log("queued", trace, effects);
process.nextTick(() => console.log("completed", trace, effects));
