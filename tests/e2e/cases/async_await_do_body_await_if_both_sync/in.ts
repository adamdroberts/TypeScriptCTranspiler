function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

async function doBodyAwaitIfBothSync(selectFirst: boolean): Promise<string> {
    do {
        if (await laterCondition(selectFirst)) {
            await later("first-prep-a");
            await later("first-prep-b");
            return "first-return";
        } else {
            await later("second-prep-a");
            await later("second-prep-b");
            throw "second-throw";
        }
    } while (await laterCondition(false));
    return await later("done");
}

doBodyAwaitIfBothSync(true).then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
doBodyAwaitIfBothSync(false).then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
