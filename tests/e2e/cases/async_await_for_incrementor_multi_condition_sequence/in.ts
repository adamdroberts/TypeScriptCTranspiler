function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorMultiConditionSequence(): Promise<string> {
    let index = 0, trace = 0;
    for (; await laterBoolean((trace = trace * 10 + 1, index < 1)) && await laterBoolean((trace = trace * 10 + 2, true)); (trace = trace * 10 + 3, await laterNumber(index++), trace = trace * 10 + 4, await laterNumber(index), trace = trace * 10 + 5)) {
        trace = trace * 10 + 6;
    }
    return await laterString(trace + "|" + index);
}

forAwaitIncrementorMultiConditionSequence().then((value) => console.log(value));
