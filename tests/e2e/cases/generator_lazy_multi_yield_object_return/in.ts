function* dynamicObject(): Generator<any, any, any> {
    return {
        first: yield "object-first",
        second: "prefix:" + (yield "object-second"),
    };
}

const iterator = dynamicObject();
const first: any = iterator.next();
const second: any = iterator.next("left");
const done: any = iterator.next("right");
const result = done.value as any;

console.log(
    first.done,
    first.value,
    second.done,
    second.value,
    done.done,
    result.first,
    result.second,
);
