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

async function doBodyTryAwaitCatchAwaitFinallyAwaitBreak(): Promise<string> {
    do {
        try {
            await failingBody();
        } catch {
            await recover("recover");
        } finally {
            await cleanup("cleanup");
        }
        break;
    } while (await Promise.resolve(true));
    return await Promise.resolve(bodyCount + "|" + recoveryCount + "|" + cleanupCount);
}

doBodyTryAwaitCatchAwaitFinallyAwaitBreak().then((value) => console.log(value));
