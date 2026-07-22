let bodyCount = 0;
let recoveryCount = 0;
let cleanupCount = 0;

function failingBody(value: string): Promise<void> {
    bodyCount++;
    return value === "fail" ? Promise.reject("body-failed") : Promise.resolve(undefined);
}

function recover(value: string): Promise<void> {
    recoveryCount++;
    return Promise.resolve(undefined);
}

function cleanup(value: string): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

async function forInBodyTryAwaitCatchAwaitFinallyAwaitReturn(): Promise<string> {
    const values: Record<string, string> = { first: "fail", second: "ok" };
    for (const key in values) {
        try {
            await failingBody(values[key]);
        } catch {
            await recover("recover-" + key);
        } finally {
            await cleanup("cleanup-" + key);
        }
        return await Promise.resolve(bodyCount + "|" + recoveryCount + "|" + cleanupCount);
    }
    return await Promise.resolve("unexpected");
}

forInBodyTryAwaitCatchAwaitFinallyAwaitReturn().then((value) => console.log(value));
