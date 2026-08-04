interface TypedResult {
    left: number;
    right: number;
    marker: number;
}

function* typedArray(): Generator<string, string[], boolean> {
    return [
        ...((yield "typed-array-left") ? "AB" : "CD"),
        ...((yield "typed-array-right") ? "EF" : "GH"),
        "!",
    ];
}

function* typedObject(): Generator<string, TypedResult, boolean> {
    return {
        ...((yield "typed-object-first") ? { left: 1, right: 0 } : { left: 0, right: 2 }),
        ...((yield "typed-object-second") ? { left: 8, right: 4 } : { left: 9, right: 5 }),
        marker: 3,
    };
}

function* dynamicArray(): Generator<any, any, any> {
    return [
        ...((yield "dynamic-array-left") ? "XY" : "Z"),
        ...((yield "dynamic-array-right") ? "PQ" : "MN"),
        "!",
    ];
}

function* dynamicObject(): Generator<any, any, any> {
    return {
        ...((yield "dynamic-object-first") ? { left: "L", right: "R0" } : { left: "l0", right: "r0" }),
        ...((yield "dynamic-object-second") ? { left: "L1", right: "R1" } : { left: "l2", right: "r2" }),
        marker: "!",
    };
}

const typedArrayIterator = typedArray();
const typedArrayFirst: any = typedArrayIterator.next();
const typedArraySecond: any = typedArrayIterator.next(true);
const typedArrayDone: any = typedArrayIterator.next(false);
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
const typedObjectSecond: any = typedObjectIterator.next(false);
const typedObjectDone: any = typedObjectIterator.next(true);
const typedObjectValue = typedObjectDone.value as TypedResult;
console.log(
    "typed-object",
    typedObjectFirst.done,
    typedObjectFirst.value,
    typedObjectSecond.done,
    typedObjectSecond.value,
    typedObjectDone.done,
    typedObjectValue.right,
    typedObjectValue.marker,
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next(false);
const dynamicArrayDone: any = dynamicArrayIterator.next(true);
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
const dynamicObjectSecond: any = dynamicObjectIterator.next(true);
const dynamicObjectDone: any = dynamicObjectIterator.next(false);
const dynamicObjectValue = dynamicObjectDone.value as any;
console.log(
    "dynamic-object",
    dynamicObjectFirst.done,
    dynamicObjectFirst.value,
    dynamicObjectSecond.done,
    dynamicObjectSecond.value,
    dynamicObjectDone.done,
    dynamicObjectValue.left,
    dynamicObjectValue.marker,
);
