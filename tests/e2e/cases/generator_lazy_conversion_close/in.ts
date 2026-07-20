const events: string[] = [];

function* source(): Generator<string, string, string> {
    try {
        events.push("inner-start");
        yield "pause";
    } finally {
        events.push("inner-finally");
    }
    return "inner-done";
}

function closeThroughConversion(iter: Generator<any, string, string>): void {
    const first: any = iter.next();
    const result: any = iter.return("closed");
    console.log("return", first.done, first.value, result.done, result.value, events.join("|"));
}

function throwThroughConversion(iter: Generator<any, string, string>): void {
    const first: any = iter.next();
    try {
        iter.throw("boom");
    } catch {
        console.log("throw", first.done, first.value, events.join("|"));
    }
}

closeThroughConversion(source());
throwThroughConversion(source());
