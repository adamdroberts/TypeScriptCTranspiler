let events: string[] = [];

function* route(kind: string): Generator<string, string, any> {
    events.push("start:" + kind);
    switch (kind) {
        case yield "case-select":
            events.push("yielded-case");
            break;
        case "beta":
            events.push("static-case");
            break;
        default:
            events.push("default");
            break;
    }
    events.push("done");
    return "complete";
}

function* closeCase(): Generator<string, string, any> {
    try {
        switch ("close") {
            case yield "close-case":
                events.push("close-body");
        }
    } finally {
        events.push("close-finally");
    }
    return "close-complete";
}

function run(kind: string, value: string): void {
    events = [];
    const iter = route(kind);
    let step: any = iter.next();
    console.log("route", kind, step.done, step.value, events.join("|"));
    step = iter.next(value);
    console.log("route", kind, step.done, step.value, events.join("|"));
}

run("alpha", "alpha");
run("beta", "alpha");
run("other", "alpha");

events = [];
const closeIter = closeCase();
const closeFirst: any = closeIter.next();
const closeResult: any = closeIter.return("closed");
console.log("close", closeFirst.done, closeFirst.value, closeResult.done, closeResult.value, events.join("|"));
