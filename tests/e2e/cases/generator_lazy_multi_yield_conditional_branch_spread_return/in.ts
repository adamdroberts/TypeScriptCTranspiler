interface TypedResult {
    left: number;
    right: number;
    marker: number;
}

function* typedArray(): Generator<string, string[], string> {
    return [...((yield "typed-condition") ? (yield "typed-left") : (yield "typed-right")), "!"];
}

function* typedObject(): Generator<any, TypedResult, any> {
    return {
        ...((yield "typed-object-condition") ? (yield "typed-object-left") : (yield "typed-object-right")),
        marker: 3,
    };
}

function* dynamicArray(): Generator<any, any, any> {
    return [...((yield "dynamic-condition") ? (yield "dynamic-left") : (yield "dynamic-right")), "!"];
}

function* dynamicObject(): Generator<any, any, any> {
    return {
        ...((yield "dynamic-object-condition") ? (yield "dynamic-object-left") : (yield "dynamic-object-right")),
        marker: "!",
    };
}

const typedArrayIterator = typedArray();
const typedArrayFirst: any = typedArrayIterator.next();
const typedArraySecond: any = typedArrayIterator.next("yes");
const typedArrayDone: any = typedArrayIterator.next("AB");
console.log(
    "typed-array",
    typedArrayFirst.done,
    typedArrayFirst.value,
    typedArraySecond.done,
    typedArraySecond.value,
    typedArrayDone.done,
    (typedArrayDone.value as string[]).join("|"),
);

const typedObjectIterator = typedObject();
const typedObjectFirst: any = typedObjectIterator.next();
const typedObjectSecond: any = typedObjectIterator.next(true);
const typedObjectDone: any = typedObjectIterator.next({ left: 1, right: 0 });
const typedObjectValue = typedObjectDone.value as TypedResult;
console.log(
    "typed-object",
    typedObjectFirst.done,
    typedObjectFirst.value,
    typedObjectSecond.done,
    typedObjectSecond.value,
    typedObjectDone.done,
    typedObjectValue.left,
    typedObjectValue.right,
    typedObjectValue.marker,
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next(false);
const dynamicArrayDone: any = dynamicArrayIterator.next("CD");
console.log(
    "dynamic-array",
    dynamicArrayFirst.done,
    dynamicArrayFirst.value,
    dynamicArraySecond.done,
    dynamicArraySecond.value,
    dynamicArrayDone.done,
    (dynamicArrayDone.value as any[]).join("|"),
);

const dynamicObjectIterator = dynamicObject();
const dynamicObjectFirst: any = dynamicObjectIterator.next();
const dynamicObjectSecond: any = dynamicObjectIterator.next(false);
const dynamicObjectDone: any = dynamicObjectIterator.next({ right: "R" });
const dynamicObjectValue = dynamicObjectDone.value as any;
console.log(
    "dynamic-object",
    dynamicObjectFirst.done,
    dynamicObjectFirst.value,
    dynamicObjectSecond.done,
    dynamicObjectSecond.value,
    dynamicObjectDone.done,
    dynamicObjectValue.right,
    dynamicObjectValue.marker,
);
