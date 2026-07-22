function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

async function doBodyAwaitIfBothThrow(selectFirst: boolean): Promise<string> {
    do {
        if (await laterCondition(selectFirst)) {
            await later("first-prep-a");
            await later("first-prep-b");
            throw await later("first-throw");
        } else {
            await later("second-prep-a");
            await later("second-prep-b");
            throw await later("second-throw");
        }
    } while (await laterCondition(false));
    return await later("done");
}

doBodyAwaitIfBothThrow(true).then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
doBodyAwaitIfBothThrow(false).then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
