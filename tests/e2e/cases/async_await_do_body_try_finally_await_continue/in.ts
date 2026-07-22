let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyTryFinallyAwaitContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            await laterBody("try-" + count);
        } finally {
            count++;
        }
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyTryFinallyAwaitContinue().then((value) => console.log(value));
