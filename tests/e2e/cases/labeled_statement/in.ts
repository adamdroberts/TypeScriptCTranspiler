function labeledBlock(): string {
    let events = "";
    outer: {
        events += "a";
        break outer;
    }
    return events + "b";
}

function nestedLabeledBlock(): string {
    let events = "";
    outer: {
        events += "o";
        inner: {
            events += "i";
            break outer;
        }
        events += "unreachable";
    }
    return events;
}

function labeledContinueLoop(): string {
    let events = "";
    outer: for (let index = 0; index < 2; index++) {
        events += index;
        continue outer;
    }
    return events;
}

function crossLoopLabeledContinue(): string {
    let events = "";
    outer: for (let outerIndex = 0; outerIndex < 2; outerIndex++) {
        for (let innerIndex = 0; innerIndex < 2; innerIndex++) {
            events += `${outerIndex}${innerIndex}`;
            continue outer;
        }
    }
    return events;
}

function crossLoopWhileContinue(): number {
    let count = 0;
    outer: while (count < 2) {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    }
    return count;
}

function crossLoopDoContinue(): number {
    let count = 0;
    outer: do {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    } while (count < 2);
    return count;
}

function crossLoopForInContinue(): number {
    let count = 0;
    outer: for (const key in { a: 1, b: 2 }) {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    }
    return count;
}

function crossLoopForOfContinue(): number {
    let count = 0;
    outer: for (const value of ["a", "b"]) {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    }
    return count;
}

console.log(labeledBlock());
console.log(nestedLabeledBlock());
console.log(labeledContinueLoop());
console.log(crossLoopLabeledContinue());
console.log(crossLoopWhileContinue());
console.log(crossLoopDoContinue());
console.log(crossLoopForInContinue());
console.log(crossLoopForOfContinue());
