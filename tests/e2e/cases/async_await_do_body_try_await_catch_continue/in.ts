let bodyCount = 0;
let catchCount = 0;

function failingBody(value: string): Promise<void> {
    bodyCount++;
    return value === "fail" ? Promise.reject("body-failed") : Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyTryAwaitCatchContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            await failingBody(count === 0 ? "fail" : "ok");
        } catch {
            catchCount++;
        }
        count++;
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + catchCount + "|" + count);
}

doBodyTryAwaitCatchContinue().then((value) => console.log(value));
