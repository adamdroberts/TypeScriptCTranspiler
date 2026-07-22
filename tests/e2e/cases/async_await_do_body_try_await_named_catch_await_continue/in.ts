let recoveryReason = "";

function failingBody(): Promise<void> {
    return Promise.reject("body-failed");
}

function recover(value: string): Promise<void> {
    recoveryReason = value;
    return Promise.resolve(undefined);
}

async function doBodyTryAwaitNamedCatchAwaitContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            await failingBody();
        } catch (error) {
            await recover(String(error));
        }
        count++;
        continue;
    } while (await Promise.resolve(count < 2));
    return await Promise.resolve(recoveryReason + "|" + count);
}

doBodyTryAwaitNamedCatchAwaitContinue().then((value) => console.log(value));
