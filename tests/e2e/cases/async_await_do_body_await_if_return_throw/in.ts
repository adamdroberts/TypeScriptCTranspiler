function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

async function doBodyAwaitIfReturnThrow(selectReturn: boolean): Promise<string> {
    do {
        if (await laterCondition(selectReturn)) {
            return await later("returned-0");
        } else {
            throw await later("thrown-0");
        }
    } while (await laterCondition(false));
    return await later("done");
}

doBodyAwaitIfReturnThrow(true).then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
doBodyAwaitIfReturnThrow(false).then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
