let caughtReason = "";
let bodyCount = 0;
let cleanupCount = 0;

function failingBody(value: string): Promise<void> {
    bodyCount++;
    return value === "fail" ? Promise.reject("body-failed") : Promise.resolve(undefined);
}

function cleanup(value: string): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

async function forInBodyTryAwaitNamedCatchFinallyContinue(): Promise<string> {
    const values: Record<string, string> = { first: "fail", second: "ok" };
    for (const key in values) {
        try {
            await failingBody(values[key]);
        } catch (error) {
            caughtReason = String(error);
        } finally {
            await cleanup("cleanup-" + key);
        }
        continue;
    }
    return await Promise.resolve(caughtReason + "|" + bodyCount + "|" + cleanupCount);
}

forInBodyTryAwaitNamedCatchFinallyContinue().then((value) => console.log(value));
