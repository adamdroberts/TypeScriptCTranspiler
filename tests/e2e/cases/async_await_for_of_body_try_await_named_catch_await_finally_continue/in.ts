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

async function forOfBodyTryAwaitNamedCatchAwaitFinallyContinue(): Promise<string> {
    for (const item of ["fail", "ok"]) {
        try {
            await failingBody(item);
        } catch (error) {
            await recover(String(error));
        } finally {
            await cleanup("cleanup-" + item);
        }
        continue;
    }
    return await Promise.resolve(recoveryReason + "|" + bodyCount + "|" + cleanupCount);
}

forOfBodyTryAwaitNamedCatchAwaitFinallyContinue().then((value) => console.log(value));
