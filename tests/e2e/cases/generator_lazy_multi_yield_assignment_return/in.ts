let assigned = 0;
const box: any = { value: 1 };

function* directAssignmentReturn(): Generator<number, number, number> {
    return (assigned = yield 7) + (yield 8);
}

function* compoundAssignmentReturn(): Generator<number, number, number> {
    return (box.value += yield 8) + (yield 9);
}

const directIterator = directAssignmentReturn();
const directFirst: any = directIterator.next();
console.log("direct-before", assigned, directFirst.done, directFirst.value);
const directSecond: any = directIterator.next(4);
console.log("direct-middle", assigned, directSecond.done, directSecond.value);
const directDone: any = directIterator.next(5);
console.log("direct-done", assigned, directDone.done, directDone.value);

const compoundIterator = compoundAssignmentReturn();
const compoundFirst: any = compoundIterator.next();
console.log("compound-before", box.value, compoundFirst.done, compoundFirst.value);
const compoundSecond: any = compoundIterator.next(4);
console.log("compound-middle", box.value, compoundSecond.done, compoundSecond.value);
const compoundDone: any = compoundIterator.next(6);
console.log("compound-done", box.value, compoundDone.done, compoundDone.value);
