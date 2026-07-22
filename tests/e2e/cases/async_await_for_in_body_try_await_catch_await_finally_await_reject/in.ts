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
    return value.includes("fail") ? Promise.reject("cleanup-failed") : Promise.resolve(undefined);
}

async function forInBodyTryAwaitCatchAwaitFinallyAwaitReject(): Promise<string> {
    const values: Record<string, string> = { first: "fail", second: "ok" };
    for (const key in values) {
        try {
            await failingBody(values[key]);
        } catch {
            await recover("recover-" + key);
        } finally {
            await cleanup("cleanup-" + values[key]);
        }
        continue;
    }
    return await Promise.resolve("unexpected");
}

forInBodyTryAwaitCatchAwaitFinallyAwaitReject().then(
    (value) => console.log(value),
    (reason) => console.log(bodyCount + "|" + recoveryCount + "|" + cleanupCount + "|" + reason),
);
