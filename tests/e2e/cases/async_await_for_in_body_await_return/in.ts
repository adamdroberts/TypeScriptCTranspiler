let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

async function forInBodyAwaitReturn(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        await laterBody(values[key]);
        return await Promise.resolve(bodyCount + "|returned");
    }
    return await Promise.resolve("fallthrough");
}

forInBodyAwaitReturn().then((value) => console.log(value));
