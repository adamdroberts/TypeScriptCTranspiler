function* words(): Generator<string, string, undefined> {
    yield "alpha";
    return "omega";
}

const events: string[] = [];
function mark(label: string): undefined {
    events.push(label);
}

const iter = words();
const first: any = iter.next();
const done: any = iter.next();
const after: any = iter.next();

console.log("next:", first.done, first.value);
console.log("done:", done.done, done.value);
console.log("after:", after.done, String(after.value));

const closed = words();
console.log("return first:", (closed.next() as any).value);
const forced: any = closed.return("forced", mark("return-extra-a"), mark("return-extra-b"));
const forcedAfter: any = closed.next();
console.log("return:", forced.done, forced.value, forcedAfter.done, String(forcedAfter.value));
console.log("events:", events.join("|"));
