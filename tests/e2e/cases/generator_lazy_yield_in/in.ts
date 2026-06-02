class Box {
    name = "box";
}

function* checks(): Generator<string, string, any> {
    const dynamicKey = (yield "key?") in ({ hit: true } as any);
    const dynamicObject = "name" in (yield "obj?");
    const missing = "other" in (yield "missing?");
    const typed = "name" in new Box();
    const array = (yield "array?") in [10, 20];
    return [dynamicKey, dynamicObject, missing, typed, array].join(",");
}

const iter = checks();
const first: any = iter.next();
const second: any = iter.next("hit");
const third: any = iter.next({ name: "value" } as any);
const fourth: any = iter.next({ name: "value" } as any);
const done: any = iter.next("1");

console.log("steps:", first.value, second.value, third.value, fourth.value, done.done, done.value);
