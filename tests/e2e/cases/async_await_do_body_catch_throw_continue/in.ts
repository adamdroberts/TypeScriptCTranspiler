let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyCatchThrowContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            throw "inner";
        } catch (reason) {
            throw "catch";
        } finally {
            count++;
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyCatchThrowContinue().catch((reason) => console.log(reason));
