function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorMultiSequence(): Promise<string> {
    let index = 0, trace = 0;
    for (; await laterBoolean(index < 1); (trace = trace * 10 + 2, await laterNumber(index++), trace = trace * 10 + 3, await laterNumber(index), trace = trace * 10 + 4)) {
        trace = trace * 10 + 1;
    }
    return await laterString(trace + "|" + index);
}

forAwaitIncrementorMultiSequence().then((value) => console.log(value));
