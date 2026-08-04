let events: string[] = [];

function* route(): Generator<string, string, any> {
    events.push("start");
    switch (yield "select") {
        case "alpha":
            events.push("alpha");
            yield "alpha-yield";
            break;
        case "fall":
            events.push("fall-first");
        case "beta":
            events.push("beta");
            break;
        default:
            events.push("default");
            break;
    }
    events.push("done");
    return "complete";
}

function* closeRoute(): Generator<string, string, any> {
    try {
        switch (yield "close-select") {
            case "close":
                events.push("close-body");
            default:
                events.push("close-default");
        }
    } finally {
        events.push("close-finally");
    }
    return "close-complete";
}

function run(value: any): void {
    events = [];
    const iter = route();
    let step: any = iter.next();
    console.log("route", value, step.done, step.value, events.join("|"));
    step = iter.next(value);
    console.log("route", value, step.done, step.value, events.join("|"));
    if (value === "alpha") {
        step = iter.next("resume");
        console.log("route", value, step.done, step.value, events.join("|"));
    }
}

run("alpha");
run("fall");
run("beta");
run("other");

events = [];
const closeIter = closeRoute();
const closeFirst: any = closeIter.next();
const closeResult: any = closeIter.return("closed");
console.log("close", closeFirst.done, closeFirst.value, closeResult.done, closeResult.value, events.join("|"));
