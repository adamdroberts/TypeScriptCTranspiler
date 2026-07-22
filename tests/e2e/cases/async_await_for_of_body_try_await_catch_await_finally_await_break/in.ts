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

async function forOfBodyTryAwaitCatchAwaitFinallyAwaitBreak(): Promise<string> {
    for (const item of ["fail", "ok"]) {
        try {
            await failingBody(item);
        } catch {
            await recover("recover-" + item);
        } finally {
            await cleanup("cleanup-" + item);
        }
        break;
    }
    return await Promise.resolve(bodyCount + "|" + recoveryCount + "|" + cleanupCount);
}

forOfBodyTryAwaitCatchAwaitFinallyAwaitBreak().then((value) => console.log(value));
