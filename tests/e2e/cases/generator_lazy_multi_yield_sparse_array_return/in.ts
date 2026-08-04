function* typed(): Generator<number, (number | undefined)[], number> {
    return [, (yield 2), , (yield 4)];
}

function* dynamic(): Generator<any, any, any> {
    return [, (yield "one"), undefined, (yield "two")];
}

const typedIterator = typed();
const typedFirst: any = typedIterator.next();
const typedSecond: any = typedIterator.next(10);
const typedDone: any = typedIterator.next(20);
const typedResult = typedDone.value as (number | undefined)[];
console.log(
    "typed",
    typedFirst.done,
    typedFirst.value,
    typedSecond.done,
    typedSecond.value,
    typedDone.done,
    typedResult.length,
    Object.hasOwn(typedResult, "0"),
    typedResult[1],
    Object.hasOwn(typedResult, "2"),
    typedResult[3],
);

const dynamicIterator = dynamic();
const dynamicFirst: any = dynamicIterator.next();
const dynamicSecond: any = dynamicIterator.next("left");
const dynamicDone: any = dynamicIterator.next("right");
const dynamicResult = dynamicDone.value as any;
console.log(
    "dynamic",
    dynamicFirst.done,
    dynamicFirst.value,
    dynamicSecond.done,
    dynamicSecond.value,
    dynamicDone.done,
    dynamicResult.length,
    Object.hasOwn(dynamicResult, "0"),
    dynamicResult[1],
    Object.hasOwn(dynamicResult, "2"),
    String(dynamicResult[2]),
    dynamicResult[3],
);
