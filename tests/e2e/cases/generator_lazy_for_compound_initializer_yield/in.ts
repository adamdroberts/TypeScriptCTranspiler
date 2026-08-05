function* yieldedCompoundInitializer(): Generator<any, string, any> {
    let i = 1;
    for (i += yield "initialize-add"; i < 4; i++) {
        yield "add-body-" + i;
    }
    return "add-done";
}

function* yieldedLogicalInitializer(): Generator<any, string, any> {
    let andGate: any = true;
    let orGate: any = false;
    let nullishGate: any = null;
    for (
        andGate &&= yield "initialize-and",
        orGate ||= yield "initialize-or",
        nullishGate ??= yield "initialize-nullish";
        !andGate && orGate === "or" && nullishGate === "nullish";
    ) {
        yield "logical-body";
        andGate = true;
    }
    return "logical-done";
}

const arithmeticIterator = yieldedCompoundInitializer();
const addFirst: any = arithmeticIterator.next();
console.log("add-1", addFirst.done, addFirst.value);
const addSecond: any = arithmeticIterator.next(1);
console.log("add-2", addSecond.done, addSecond.value);
const addThird: any = arithmeticIterator.next("resume-add-body-0");
console.log("add-3", addThird.done, addThird.value);
const addFourth: any = arithmeticIterator.next("resume-add-body-1");
console.log("add-4", addFourth.done, addFourth.value);

const logicalIterator = yieldedLogicalInitializer();
const logicalFirst: any = logicalIterator.next();
console.log("logical-1", logicalFirst.done, logicalFirst.value);
const logicalSecond: any = logicalIterator.next(false);
console.log("logical-2", logicalSecond.done, logicalSecond.value);
const logicalThird: any = logicalIterator.next("or");
console.log("logical-3", logicalThird.done, logicalThird.value);
const logicalFourth: any = logicalIterator.next("nullish");
console.log("logical-4", logicalFourth.done, logicalFourth.value);
const logicalFifth: any = logicalIterator.next("resume-logical-body");
console.log("logical-5", logicalFifth.done, logicalFifth.value);
