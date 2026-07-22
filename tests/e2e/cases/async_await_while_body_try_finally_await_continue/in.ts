let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function whileBodyTryFinallyAwaitContinue(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        try {
            await laterBody("try-" + count);
        } finally {
            count++;
        }
        continue;
    }
    return await Promise.resolve(bodyCount + "|" + count);
}

whileBodyTryFinallyAwaitContinue().then((value) => console.log(value));
