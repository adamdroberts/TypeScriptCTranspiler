let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forInBodyAwaitReturn(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        await laterBody(key);
        return await Promise.resolve(bodyCount + "|returned");
    }
    return await Promise.resolve("fallthrough");
}

forInBodyAwaitReturn().then((value) => console.log(value));
