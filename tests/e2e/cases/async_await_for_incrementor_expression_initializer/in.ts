function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorExpressionInitializer(index: number, trace: number): Promise<string> {
    for (index = 0; await laterBoolean(index < 2); await laterNumber(index++)) {
        trace = trace * 10 + 1;
    }
    return await laterString(trace + "|" + index);
}

forAwaitIncrementorExpressionInitializer(99, 0).then((value) => console.log(value));
