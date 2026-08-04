function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorMixedCondition(): Promise<string> {
    for (var index = 0; await laterBoolean(index < 1) || await laterBoolean(false) && await laterBoolean(true); await laterNumber(index++)) {
        index;
    }
    return await laterString(index + "");
}

forAwaitIncrementorMixedCondition().then((value) => console.log(value));
