const events: string[] = [];
const spreadArgs: string[] = ["spread"];
const methodSpreadArgs: string[] = ["method spread"];

function mark(label: string, value: any): any {
    events.push(label);
    return value;
}

function combine(prefix: string, value: number): string {
    events.push("combine " + value);
    return prefix + ":" + value;
}

class Box {
    value: string;

    constructor(value: string) {
        events.push("box " + value);
        this.value = value;
    }
}

function* flow(): Generator<any, string, any> {
    events.push("start");
    const first = combine("call", yield 1);
    events.push("first " + first);

    const second = combine("second", yield 2);
    events.push("second " + second);

    const box = new Box(yield 3);
    events.push("boxed " + box.value);

    const optionalCall = ((yield 4) as any)?.("optional");
    events.push("optional " + String(optionalCall));
    const optionalMissing = ((yield 5) as any)?.("missing");
    const optionalMethod = ((yield 6) as any)?.run("member");
    events.push("method " + String(optionalMethod));
    const missingMethod = ((yield 7) as any)?.run("missing");
    const optionalSpread = ((yield 8) as any)?.(...spreadArgs);
    const missingSpread = ((yield 9) as any)?.(...spreadArgs);
    const optionalMethodSpread = ((yield 10) as any)?.run(...methodSpreadArgs);
    const missingMethodSpread = ((yield 11) as any)?.run(...methodSpreadArgs);
    return first + "|" + second + "|" + box.value + "|" + String(optionalCall) + "|" + String(optionalMissing) + "|" + String(optionalMethod) + "|" + String(missingMethod) + "|" + String(optionalSpread) + "|" + String(missingSpread) + "|" + String(optionalMethodSpread) + "|" + String(missingMethodSpread);
}

const iter = flow();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const r1: any = iter.next(mark("ignored", 99));
const r2: any = iter.next(mark("alpha", 7));
const r3: any = iter.next(mark("beta", 12));
const r4: any = iter.next(mark("gamma", "tail"));
const r5: any = iter.next(mark("call", (value: string) => value.toUpperCase()));
const r6: any = iter.next(mark("missing", null));
const r7: any = iter.next(mark("method", { run: (value: string) => value.toUpperCase() }));
const r8: any = iter.next(mark("missing method", null));
const r9: any = iter.next(mark("spread", (value: string) => value.toUpperCase()));
const r10: any = iter.next(mark("missing spread", null));
const r11: any = iter.next(mark("method spread", { run: (value: string) => value.toUpperCase() }));
const r12: any = iter.next(mark("missing method spread", null));

console.log("steps:", r1.done, r1.value, r2.done, r2.value, r3.done, r3.value, r4.done, r4.value, r5.done, r5.value, r6.done, r6.value, r7.done, r7.value, r8.done, r8.value, r9.done, r9.value, r10.done, r10.value, r11.done, r11.value, r12.done, r12.value);
console.log("events:", events.join("|"));
