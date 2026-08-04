function* typed(): Generator<number, number[], number> {
    return [(yield 1), 10 + (yield 2), (yield 3) * 2];
}

function* dynamic(): Generator<any, any, any> {
    return [(yield "dynamic-one"), (yield "dynamic-two")];
}

const typedIterator = typed();
const typedFirst: any = typedIterator.next();
const typedSecond: any = typedIterator.next(4);
const typedThird: any = typedIterator.next(5);
const typedDone: any = typedIterator.next(6);

console.log(
    "typed",
    typedFirst.done,
    typedFirst.value,
    typedSecond.done,
    typedSecond.value,
    typedThird.done,
    typedThird.value,
    typedDone.done,
    (typedDone.value as number[]).join(","),
);

const dynamicIterator = dynamic();
const dynamicFirst: any = dynamicIterator.next();
const dynamicSecond: any = dynamicIterator.next("left");
const dynamicDone: any = dynamicIterator.next("right");

console.log(
    "dynamic",
    dynamicFirst.done,
    dynamicFirst.value,
    dynamicSecond.done,
    dynamicSecond.value,
    dynamicDone.done,
    (dynamicDone.value as any[]).join("|"),
);
