let events: string[] = [];

function* route(kind: string): Generator<string, string, any> {
    events.push("start:" + kind);
    switch (kind) {
        case "alpha":
            events.push("static-case");
            break;
        case yield "case-select":
            events.push("first-yielded-case");
            break;
        case yield "second-select":
            events.push("second-yielded-case");
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
        const closeKind: string = "close";
        switch (closeKind) {
            case "first":
            case yield "close-case":
                events.push("close-body");
        }
    } finally {
        events.push("close-finally");
    }
    return "close-complete";
}

events = [];
let iter = route("alpha");
let step: any = iter.next();
console.log("alpha", step.done, step.value, events.join("|"));

events = [];
iter = route("beta");
step = iter.next();
console.log("beta", step.done, step.value, events.join("|"));
step = iter.next("no");
console.log("beta", step.done, step.value, events.join("|"));
step = iter.next("beta");
console.log("beta", step.done, step.value, events.join("|"));

events = [];
iter = route("other");
step = iter.next();
console.log("other", step.done, step.value, events.join("|"));
step = iter.next("no");
console.log("other", step.done, step.value, events.join("|"));
step = iter.next("no");
console.log("other", step.done, step.value, events.join("|"));

events = [];
const closeIter = closeCase();
const closeFirst: any = closeIter.next();
const closeResult: any = closeIter.return("closed");
console.log("close", closeFirst.done, closeFirst.value, closeResult.done, closeResult.value, events.join("|"));
