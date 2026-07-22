let bodyCount = 0;
let recoveryCount = 0;

function failingBody(value: string): Promise<void> {
    bodyCount++;
    return value === "fail" ? Promise.reject("body-failed") : Promise.resolve(undefined);
}

function recover(value: string): Promise<void> {
    recoveryCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyTryAwaitCatchAwaitContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            await failingBody(count === 0 ? "fail" : "ok");
        } catch {
            await recover("recover-" + count);
        }
        count++;
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + recoveryCount + "|" + count);
}

doBodyTryAwaitCatchAwaitContinue().then((value) => console.log(value));
