interface SpreadResult {
    first: number;
    second: number;
    third: number;
    final: number;
}

function* typedArray(): Generator<number, number[], number> {
    const tail: number[] = [2, 3];
    return [(yield 1), ...tail, (yield 4)];
}

function* stringArray(): Generator<string, string[], string> {
    return [(yield "first"), ..."ab", (yield "last")];
}

function* dynamicArray(): Generator<any, any, any> {
    const tail: any = ["tail-one", "tail-two"];
    const suffix: any = "xy";
    return [(yield "dynamic-one"), ...tail, ...suffix, (yield "dynamic-last")];
}

function* dynamicObject(): Generator<any, any, any> {
    const extra: any = { second: "extra-second", third: "extra-third" };
    return {
        first: yield "object-first",
        ...extra,
        final: yield "object-final",
    };
}

function* typedObject(): Generator<number, SpreadResult, number> {
    const extra: any = { second: 2, third: 3 };
    return {
        first: yield 1,
        ...extra,
        final: yield 4,
    };
}

const typedArrayIterator = typedArray();
const typedArrayFirst: any = typedArrayIterator.next();
const typedArraySecond: any = typedArrayIterator.next(10);
const typedArrayDone: any = typedArrayIterator.next(40);
console.log("typed-array", typedArrayFirst.done, typedArrayFirst.value, typedArraySecond.done, typedArraySecond.value, typedArrayDone.done, (typedArrayDone.value as number[]).join(","));

const stringArrayIterator = stringArray();
const stringArrayFirst: any = stringArrayIterator.next();
const stringArraySecond: any = stringArrayIterator.next("left");
const stringArrayDone: any = stringArrayIterator.next("right");
console.log("string-array", stringArrayFirst.done, stringArrayFirst.value, stringArraySecond.done, stringArraySecond.value, stringArrayDone.done, (stringArrayDone.value as string[]).join("|"));

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next("left");
const dynamicArrayDone: any = dynamicArrayIterator.next("right");
console.log("dynamic-array", dynamicArrayFirst.done, dynamicArrayFirst.value, dynamicArraySecond.done, dynamicArraySecond.value, dynamicArrayDone.done, (dynamicArrayDone.value as any[]).join("|"));

const dynamicObjectIterator = dynamicObject();
const dynamicObjectFirst: any = dynamicObjectIterator.next();
const dynamicObjectSecond: any = dynamicObjectIterator.next("left");
const dynamicObjectDone: any = dynamicObjectIterator.next("right");
const dynamicObjectResult = dynamicObjectDone.value as any;
console.log("dynamic-object", dynamicObjectFirst.done, dynamicObjectFirst.value, dynamicObjectSecond.done, dynamicObjectSecond.value, dynamicObjectDone.done, dynamicObjectResult.first, dynamicObjectResult.second, dynamicObjectResult.third, dynamicObjectResult.final);

const typedObjectIterator = typedObject();
const typedObjectFirst: any = typedObjectIterator.next();
const typedObjectSecond: any = typedObjectIterator.next(10);
const typedObjectDone: any = typedObjectIterator.next(40);
const typedObjectResult = typedObjectDone.value as SpreadResult;
console.log("typed-object", typedObjectFirst.done, typedObjectFirst.value, typedObjectSecond.done, typedObjectSecond.value, typedObjectDone.done, typedObjectResult.first, typedObjectResult.second, typedObjectResult.third, typedObjectResult.final);
