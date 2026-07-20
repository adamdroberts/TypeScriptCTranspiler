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

function* recoveringSource(): Generator<string, string, string> {
    try {
        events.push("recovering-start");
        yield "recovering-pause";
    } catch (error: any) {
        events.push("recovering-catch:" + error);
        return "recovering-done";
    } finally {
        events.push("recovering-finally");
    }
    return "recovering-normal";
}

function* anyRecoveringSource(): Generator<any, string, string> {
    try {
        events.push("reverse-start");
        yield "reverse-pause";
    } catch (error: any) {
        events.push("reverse-catch:" + error);
        return "reverse-done";
    } finally {
        events.push("reverse-finally");
    }
    return "reverse-normal";
}

function convertAnySource(iter: Generator<any, string, string>): Generator<string, string, string> {
    return iter;
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

function recoverThroughConversion(iter: Generator<any, string, string>): void {
    const first: any = iter.next();
    const result: any = iter.throw("recover");
    console.log("recover", first.done, first.value, result.done, result.value, events.join("|"));
}

closeThroughConversion(source());
throwThroughConversion(source());
recoverThroughConversion(recoveringSource());

const reverseIterator = convertAnySource(anyRecoveringSource());
const reverseYield: any = reverseIterator.next();
const reverseResult: any = reverseIterator.throw("reverse-recover");
console.log("recover-reverse", reverseYield.done, reverseYield.value, reverseResult.done, reverseResult.value, events.join("|"));
