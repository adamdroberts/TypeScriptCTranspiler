function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorConditionalCondition(): Promise<string> {
    for (var index = 0; await laterBoolean(index < 2) ? await laterBoolean(true) : await laterBoolean(false); await laterNumber(index++)) {
        index;
    }
    return await laterString(index + "");
}

forAwaitIncrementorConditionalCondition().then((value) => console.log(value));
