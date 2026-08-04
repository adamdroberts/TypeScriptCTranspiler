function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forAwaitIncrementorAwaitInitializerMultiCondition(): Promise<string> {
    for (var index = await laterNumber(0); await laterBoolean(index < 2) && await laterBoolean(index < 2); await laterNumber(index++)) {
        index;
    }
    return await laterString(index + "");
}

forAwaitIncrementorAwaitInitializerMultiCondition().then((value) => console.log(value));
