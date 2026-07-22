let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyForOfContinue(): Promise<string> {
    let count = 0;
    do {
        for (const item of [1]) {
            count += item;
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyForOfContinue().then((value) => console.log(value));
