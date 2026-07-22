function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

async function doBodyAwaitIfBothReturn(selectFirst: boolean): Promise<string> {
    do {
        if (await laterCondition(selectFirst)) {
            await later("first-prep-a");
            await later("first-prep-b");
            return await later("first-return");
        } else {
            await later("second-prep-a");
            await later("second-prep-b");
            return await later("second-return");
        }
    } while (await laterCondition(false));
    return await later("done");
}

doBodyAwaitIfBothReturn(true).then((value) => console.log(value));
doBodyAwaitIfBothReturn(false).then((value) => console.log(value));
