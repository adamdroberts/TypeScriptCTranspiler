let caughtReason = "";

function failingBody(): Promise<void> {
    return Promise.reject("body-failed");
}

async function doBodyTryAwaitNamedCatchContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            await failingBody();
        } catch (error) {
            caughtReason = String(error);
        }
        count++;
        continue;
    } while (await Promise.resolve(count < 2));
    return await Promise.resolve(caughtReason + "|" + count);
}

doBodyTryAwaitNamedCatchContinue().then((value) => console.log(value));
