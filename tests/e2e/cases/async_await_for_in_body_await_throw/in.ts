let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterReason(value: string): Promise<string> {
    return Promise.resolve(value);
}

async function forInBodyAwaitThrow(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        await laterBody(values[key]);
        throw await laterReason("in-throw-" + bodyCount);
    }
    return await Promise.resolve("fallthrough");
}

forInBodyAwaitThrow().then(
    (value) => console.log(value),
    (reason) => console.log(reason),
);
