const events: string[] = [];

function makeKey(): string {
    events.push("key");
    return "computed";
}

function* dynamicObject(): Generator<any, any, any> {
    return {
        [makeKey()]: yield "first",
        final: yield "last",
    };
}

const iterator = dynamicObject();
const first: any = iterator.next();
console.log("first", first.done, first.value, events.length);
const second: any = iterator.next("value");
console.log("second", second.done, second.value, events.length);
const done: any = iterator.next("final");
const result = done.value as any;
console.log("done", done.done, result.computed, result.final, events.join("|"));
