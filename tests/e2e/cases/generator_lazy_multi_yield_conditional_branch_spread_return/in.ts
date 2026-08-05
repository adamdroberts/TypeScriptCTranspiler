interface TypedResult {
    left: number;
    right: number;
    marker: number;
}

function* typedArray(): Generator<string, string[], string> {
    return [
        ...((yield "typed-condition")
            ? ((yield "typed-left-a") + (yield "typed-left-b"))
            : ((yield "typed-right-a") + (yield "typed-right-b"))),
        "!",
    ];
}

function* typedObject(): Generator<string, TypedResult, number> {
    return {
        ...((yield "typed-object-condition")
            ? { left: yield "typed-object-left-a", right: yield "typed-object-left-b" }
            : { left: yield "typed-object-right-a", right: yield "typed-object-right-b" }),
        marker: 3,
    };
}

function* dynamicArray(): Generator<any, any, any> {
    return [
        ...((yield "dynamic-condition")
            ? ((yield "dynamic-left-a") + (yield "dynamic-left-b"))
            : ((yield "dynamic-right-a") + (yield "dynamic-right-b"))),
        "!",
    ];
}

function* dynamicObject(): Generator<any, any, any> {
    return {
        ...((yield "dynamic-object-condition")
            ? { left: yield "dynamic-object-left-a", right: yield "dynamic-object-left-b" }
            : { left: yield "dynamic-object-right-a", right: yield "dynamic-object-right-b" }),
        marker: "!",
    };
}

const typedArrayIterator = typedArray();
const typedArrayFirst: any = typedArrayIterator.next();
const typedArraySecond: any = typedArrayIterator.next("yes");
const typedArrayThird: any = typedArrayIterator.next("A");
const typedArrayDone: any = typedArrayIterator.next("B");
console.log(
    "typed-array",
    typedArrayFirst.done,
    typedArrayFirst.value,
    typedArraySecond.done,
    typedArraySecond.value,
    typedArrayThird.done,
    typedArrayThird.value,
    typedArrayDone.done,
    (typedArrayDone.value as string[]).join("|"),
);

const typedObjectIterator = typedObject();
const typedObjectFirst: any = typedObjectIterator.next();
const typedObjectSecond: any = typedObjectIterator.next(1);
const typedObjectThird: any = typedObjectIterator.next(10);
const typedObjectDone: any = typedObjectIterator.next(20);
const typedObjectValue = typedObjectDone.value as TypedResult;
console.log(
    "typed-object",
    typedObjectFirst.done,
    typedObjectFirst.value,
    typedObjectSecond.done,
    typedObjectSecond.value,
    typedObjectThird.done,
    typedObjectThird.value,
    typedObjectDone.done,
    typedObjectValue.left,
    typedObjectValue.right,
    typedObjectValue.marker,
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next(false);
const dynamicArrayThird: any = dynamicArrayIterator.next("C");
const dynamicArrayDone: any = dynamicArrayIterator.next("D");
console.log(
    "dynamic-array",
    dynamicArrayFirst.done,
    dynamicArrayFirst.value,
    dynamicArraySecond.done,
    dynamicArraySecond.value,
    dynamicArrayThird.done,
    dynamicArrayThird.value,
    dynamicArrayDone.done,
    (dynamicArrayDone.value as any[]).join("|"),
);

const dynamicObjectIterator = dynamicObject();
const dynamicObjectFirst: any = dynamicObjectIterator.next();
const dynamicObjectSecond: any = dynamicObjectIterator.next(false);
const dynamicObjectThird: any = dynamicObjectIterator.next("right-left");
const dynamicObjectDone: any = dynamicObjectIterator.next("right-right");
const dynamicObjectValue = dynamicObjectDone.value as any;
console.log(
    "dynamic-object",
    dynamicObjectFirst.done,
    dynamicObjectFirst.value,
    dynamicObjectSecond.done,
    dynamicObjectSecond.value,
    dynamicObjectThird.done,
    dynamicObjectThird.value,
    dynamicObjectDone.done,
    dynamicObjectValue.right,
    dynamicObjectValue.marker,
);
