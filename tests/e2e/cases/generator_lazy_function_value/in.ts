const events: string[] = [];

function* source(): Generator<string, string, string> {
    events.push("start");
    const value = yield "pause";
    events.push("resume:" + value);
    return "done";
}

const direct: () => Generator<string, string, string> = source;
const alias: () => Generator<string, string, string> = direct;
const iter = alias();

console.log("created", events.join("|"));
const first: any = iter.next("ignored");
console.log("first", first.done, first.value, events.join("|"));
const second: any = iter.next("answer");
console.log("second", second.done, second.value, events.join("|"));
