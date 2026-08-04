interface TypedObjectResult {
    first: number;
    middle: number;
    last: number;
}

function* typedArray(): Generator<number[], number[], number[]> {
    return [...(yield [1, 2]), 9, ...(yield [3, 4])];
}

function* dynamicArray(): Generator<any, any, any> {
    return [...(yield ["prompt"]), "middle", ...(yield ["tail"])];
}

function* typedObject(): Generator<any, TypedObjectResult, any> {
    return {
        ...(yield { first: 1 }),
        middle: yield 2,
        ...(yield { last: 3 }),
    };
}

function* dynamicObject(): Generator<any, any, any> {
    return {
        ...(yield { first: "prompt-first" }),
        middle: yield "prompt-middle",
        ...(yield { last: "prompt-last" }),
    };
}

const typedArrayIterator = typedArray();
const typedArrayFirst: any = typedArrayIterator.next();
const typedArraySecond: any = typedArrayIterator.next([10, 11]);
const typedArrayDone: any = typedArrayIterator.next([20, 21]);
console.log(
    "typed-array",
    typedArrayFirst.done,
    typedArrayFirst.value.join(","),
    typedArraySecond.done,
    typedArraySecond.value.join(","),
    typedArrayDone.done,
    (typedArrayDone.value as number[]).join(","),
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next("left");
const dynamicArrayDone: any = dynamicArrayIterator.next(["right-one", "right-two"]);
console.log(
    "dynamic-array",
    dynamicArrayFirst.done,
    dynamicArrayFirst.value.join("|"),
    dynamicArraySecond.done,
    dynamicArraySecond.value.join("|"),
    dynamicArrayDone.done,
    (dynamicArrayDone.value as any[]).join("|"),
);

const typedObjectIterator = typedObject();
const typedObjectFirst: any = typedObjectIterator.next();
const typedObjectSecond: any = typedObjectIterator.next({ first: 10 });
const typedObjectThird: any = typedObjectIterator.next(20);
const typedObjectDone: any = typedObjectIterator.next({ last: 30 });
const typedObjectResult = typedObjectDone.value as TypedObjectResult;
console.log(
    "typed-object",
    typedObjectFirst.done,
    typedObjectFirst.value.first,
    typedObjectSecond.done,
    typedObjectSecond.value,
    typedObjectThird.done,
    typedObjectThird.value.last,
    typedObjectDone.done,
    typedObjectResult.first,
    typedObjectResult.middle,
    typedObjectResult.last,
);

const dynamicObjectIterator = dynamicObject();
const dynamicObjectFirst: any = dynamicObjectIterator.next();
const dynamicObjectSecond: any = dynamicObjectIterator.next({ first: "left" });
const dynamicObjectThird: any = dynamicObjectIterator.next("middle");
const dynamicObjectDone: any = dynamicObjectIterator.next({ last: "right" });
const dynamicObjectResult = dynamicObjectDone.value as any;
console.log(
    "dynamic-object",
    dynamicObjectFirst.done,
    dynamicObjectFirst.value.first,
    dynamicObjectSecond.done,
    dynamicObjectSecond.value,
    dynamicObjectThird.done,
    dynamicObjectThird.value.last,
    dynamicObjectDone.done,
    dynamicObjectResult.first,
    dynamicObjectResult.middle,
    dynamicObjectResult.last,
);
