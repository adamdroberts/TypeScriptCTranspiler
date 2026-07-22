let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyTryFinallyThrowContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            count++;
        } finally {
            throw "finally";
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyTryFinallyThrowContinue().catch((reason) => console.log(reason));
