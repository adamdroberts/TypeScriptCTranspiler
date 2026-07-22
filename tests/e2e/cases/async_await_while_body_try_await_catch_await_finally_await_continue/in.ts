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

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function whileBodyTryAwaitCatchAwaitFinallyAwaitContinue(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        try {
            await failingBody(count === 0 ? "fail" : "ok");
        } catch {
            await recover("recover-" + count);
        } finally {
            await cleanup("cleanup-" + count);
        }
        count++;
        continue;
    }
    return await Promise.resolve(bodyCount + "|" + recoveryCount + "|" + cleanupCount + "|" + count);
}

whileBodyTryAwaitCatchAwaitFinallyAwaitContinue().then((value) => console.log(value));
