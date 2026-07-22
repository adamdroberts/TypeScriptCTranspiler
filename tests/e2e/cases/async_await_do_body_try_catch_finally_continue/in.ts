let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyTryCatchFinallyContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            throw "inner";
        } catch (reason) {
            count++;
        } finally {
            count++;
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 4));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyTryCatchFinallyContinue().then((value) => console.log(value));
