function* multiYieldAssignmentInitializer(): Generator<string, string, number> {
    let i = 0;
    for (i = (yield "assign-a") + (yield "assign-b"); i < 3; i++) {
        yield "assign-body-" + i;
    }
    return "assign-done";
}

function* multiYieldCompoundInitializer(): Generator<string, string, number> {
    let i = 0;
    for (i += (yield "compound-a") + (yield "compound-b"); i < 3; i++) {
        yield "compound-body-" + i;
    }
    return "compound-done";
}

const assignmentIterator = multiYieldAssignmentInitializer();
const assignFirst: any = assignmentIterator.next();
console.log("assign-1", assignFirst.done, assignFirst.value);
const assignSecond: any = assignmentIterator.next(1);
console.log("assign-2", assignSecond.done, assignSecond.value);
const assignThird: any = assignmentIterator.next(1);
console.log("assign-3", assignThird.done, assignThird.value);
const assignFourth: any = assignmentIterator.next();
console.log("assign-4", assignFourth.done, assignFourth.value);

const compoundIterator = multiYieldCompoundInitializer();
const compoundFirst: any = compoundIterator.next();
console.log("compound-1", compoundFirst.done, compoundFirst.value);
const compoundSecond: any = compoundIterator.next(1);
console.log("compound-2", compoundSecond.done, compoundSecond.value);
const compoundThird: any = compoundIterator.next(1);
console.log("compound-3", compoundThird.done, compoundThird.value);
const compoundFourth: any = compoundIterator.next();
console.log("compound-4", compoundFourth.done, compoundFourth.value);
