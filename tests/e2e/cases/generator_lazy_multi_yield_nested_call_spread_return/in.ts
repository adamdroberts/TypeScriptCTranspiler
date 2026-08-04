interface NestedCallObjectResult {
    first: number;
    middle: number;
    last: number;
}

function typedParts(first: number, last: number): number[] {
    return [first, last];
}

function dynamicParts(first: any, last: any): any {
    return [first, last];
}

function typedObjectPart(first: number, last: number): { first: number; last: number } {
    return { first, last };
}

function dynamicObjectPart(first: any, last: any): any {
    return { first, last };
}

function* typedArray(): Generator<number, number[], number> {
    return [...typedParts(yield 1, yield 2), 9];
}

function* dynamicArray(): Generator<any, any, any> {
    return [...dynamicParts(yield "first", yield "second"), "tail"];
}

function* typedObject(): Generator<number, NestedCallObjectResult, number> {
    return {
        ...typedObjectPart(yield 1, yield 3),
        middle: yield 2,
    };
}

function* dynamicObject(): Generator<any, any, any> {
    return {
        ...dynamicObjectPart(yield "first", yield "last"),
        middle: yield "middle",
    };
}

const typedArrayIterator = typedArray();
const typedArrayFirst: any = typedArrayIterator.next();
const typedArraySecond: any = typedArrayIterator.next(10);
const typedArrayDone: any = typedArrayIterator.next(20);
console.log(
    "typed-array",
    typedArrayFirst.done,
    typedArrayFirst.value,
    typedArraySecond.done,
    typedArraySecond.value,
    typedArrayDone.done,
    (typedArrayDone.value as number[]).join(","),
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next("left");
const dynamicArrayDone: any = dynamicArrayIterator.next("right");
console.log(
    "dynamic-array",
    dynamicArrayFirst.done,
    dynamicArrayFirst.value,
    dynamicArraySecond.done,
    dynamicArraySecond.value,
    dynamicArrayDone.done,
    (dynamicArrayDone.value as any[]).join("|"),
);

const typedObjectIterator = typedObject();
const typedObjectFirst: any = typedObjectIterator.next();
const typedObjectSecond: any = typedObjectIterator.next(10);
const typedObjectThird: any = typedObjectIterator.next(30);
const typedObjectDone: any = typedObjectIterator.next(20);
const typedObjectResult = typedObjectDone.value as NestedCallObjectResult;
console.log(
    "typed-object",
    typedObjectFirst.done,
    typedObjectFirst.value,
    typedObjectSecond.done,
    typedObjectSecond.value,
    typedObjectThird.done,
    typedObjectThird.value,
    typedObjectDone.done,
    typedObjectResult.first,
    typedObjectResult.middle,
    typedObjectResult.last,
);

const dynamicObjectIterator = dynamicObject();
const dynamicObjectFirst: any = dynamicObjectIterator.next();
const dynamicObjectSecond: any = dynamicObjectIterator.next("left");
const dynamicObjectThird: any = dynamicObjectIterator.next("right");
const dynamicObjectDone: any = dynamicObjectIterator.next("middle");
const dynamicObjectResult = dynamicObjectDone.value as any;
console.log(
    "dynamic-object",
    dynamicObjectFirst.done,
    dynamicObjectFirst.value,
    dynamicObjectSecond.done,
    dynamicObjectSecond.value,
    dynamicObjectThird.done,
    dynamicObjectThird.value,
    dynamicObjectDone.done,
    dynamicObjectResult.first,
    dynamicObjectResult.middle,
    dynamicObjectResult.last,
);
