let bodyCount = 0;
let recoveryCount = 0;
let cleanupCount = 0;

function failingBody(): Promise<void> {
    bodyCount++;
    return Promise.reject("body-failed");
}

function recover(value: string): Promise<void> {
    recoveryCount++;
    return Promise.resolve(undefined);
}

function cleanup(value: string): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

async function doBodyTryAwaitCatchAwaitFinallyAwaitReturn(): Promise<string> {
    do {
        try {
            await failingBody();
        } catch {
            await recover("recover");
        } finally {
            await cleanup("cleanup");
        }
        return await Promise.resolve(bodyCount + "|" + recoveryCount + "|" + cleanupCount);
    } while (await Promise.resolve(true));
    return "unexpected";
}

doBodyTryAwaitCatchAwaitFinallyAwaitReturn().then((value) => console.log(value));
