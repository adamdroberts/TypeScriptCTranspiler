let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyForContinue(): Promise<string> {
    let count = 0;
    do {
        for (let index = 0; index < 1; index++) {
            count += index + 1;
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyForContinue().then((value) => console.log(value));
