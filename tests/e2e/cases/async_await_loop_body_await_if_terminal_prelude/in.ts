function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

async function loopBodyAwaitIfTerminalPrelude(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 1)) {
        if (await laterCondition(count === 0)) {
            await later("prep-a");
            await later("prep-b");
            return await later("true");
        } else {
            await later("prep-a-false");
            await later("prep-b-false");
            return await later("false");
        }
    }
    return await later("done");
}

loopBodyAwaitIfTerminalPrelude().then((value) => console.log(value));
