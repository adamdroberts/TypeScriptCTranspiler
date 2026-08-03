function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorIfContinue(): Promise<string> {
    let index = 0, trace = 0;
    for (; await laterBoolean(index < 2); await laterNumber(index++)) {
        trace = trace * 10 + 1;
        if (index === 0) continue;
    }
    return await laterString(trace + "|" + index);
}

forAwaitIncrementorIfContinue().then((value) => console.log(value));
