let recoveryReason = "";
let bodyCount = 0;
let cleanupCount = 0;

function failingBody(value: string): Promise<void> {
    bodyCount++;
    return value === "fail" ? Promise.reject("body-failed") : Promise.resolve(undefined);
}

function recover(value: string): Promise<void> {
    recoveryReason = value;
    return Promise.resolve(undefined);
}

function cleanup(value: string): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

async function forInBodyTryAwaitNamedCatchAwaitFinallyContinue(): Promise<string> {
    const values: Record<string, string> = { first: "fail", second: "ok" };
    for (const key in values) {
        try {
            await failingBody(values[key]);
        } catch (error) {
            await recover(String(error));
        } finally {
            await cleanup("cleanup-" + key);
        }
        continue;
    }
    return await Promise.resolve(recoveryReason + "|" + bodyCount + "|" + cleanupCount);
}

forInBodyTryAwaitNamedCatchAwaitFinallyContinue().then((value) => console.log(value));
