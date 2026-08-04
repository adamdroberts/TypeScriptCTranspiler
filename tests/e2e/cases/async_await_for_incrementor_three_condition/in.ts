function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorThreeCondition(): Promise<string> {
    for (var index = 0, trace = 0; await laterBoolean((trace = trace * 10 + 1, index < 2)) && await laterBoolean((trace = trace * 10 + 2, true)) && await laterBoolean((trace = trace * 10 + 3, true)); await laterNumber((trace = trace * 10 + 5, index++))) {
        trace = trace * 10 + 4;
    }
    return await laterString(trace + "|" + index);
}

forAwaitIncrementorThreeCondition().then((value) => console.log(value));
