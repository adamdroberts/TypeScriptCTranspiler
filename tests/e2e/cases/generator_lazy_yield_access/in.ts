const events: string[] = [];

function mark(label: string, value: any): any {
    events.push(label);
    return value;
}

function* access(): Generator<number, string, any> {
    events.push("start");
    const label: string = (yield 1).label;
    events.push("label " + label);

    let picked: number = 0;
    picked = (yield 2)[1];
    events.push("picked " + picked);

    const nested: string = (yield 3).nested.code;
    events.push("nested " + nested);

    return (yield 4)["tail"] + ":" + picked;
}

const iter = access();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const r1: any = iter.next(mark("ignored", { label: "unused" }));
const r2: any = iter.next(mark("alpha", { label: "alpha" }));
const r3: any = iter.next(mark("array", [10, 42]));
const r4: any = iter.next(mark("nested", { nested: { code: "deep" } }));
const done: any = iter.next(mark("tail", { tail: "done" }));

console.log("steps:", r1.done, r1.value, r2.done, r2.value, r3.done, r3.value, r4.done, r4.value, done.done, done.value);
console.log("events:", events.join("|"));
