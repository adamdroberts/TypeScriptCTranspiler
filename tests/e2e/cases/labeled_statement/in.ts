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

console.log(labeledBlock());
console.log(nestedLabeledBlock());
