function* typedArray(): Generator<string, string[], string> {
    return [...((yield "left") + (yield "right")), "!"];
}

function* dynamicArray(): Generator<any, any, any> {
    return [...((yield "dynamic-left") + (yield "dynamic-right")), "!"];
}

const typedIterator = typedArray();
const typedFirst: any = typedIterator.next();
const typedSecond: any = typedIterator.next("AB");
const typedDone: any = typedIterator.next("CD");
console.log(
    "typed",
    typedFirst.done,
    typedFirst.value,
    typedSecond.done,
    typedSecond.value,
    typedDone.done,
    (typedDone.value as string[]).join("|"),
);

const dynamicIterator = dynamicArray();
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
