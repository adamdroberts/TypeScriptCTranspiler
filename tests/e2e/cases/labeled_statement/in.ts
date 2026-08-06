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

console.log(labeledBlock());
console.log(nestedLabeledBlock());
console.log(labeledContinueLoop());
