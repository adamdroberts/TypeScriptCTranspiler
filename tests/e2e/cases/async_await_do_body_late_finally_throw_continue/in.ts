let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyLateFinallyThrowContinue(): Promise<string> {
    let count = 0;
    do {
        count++;
        if (count === 2) {
            try {
                count++;
            } finally {
                throw "late-finally";
            }
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 3));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyLateFinallyThrowContinue().catch((reason) => console.log(reason));
