let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

async function forInBodyAwaitContinue(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        await laterBody(values[key]);
        continue;
    }
    return await Promise.resolve(bodyCount + "|done");
}

forInBodyAwaitContinue().then((value) => console.log(value));
