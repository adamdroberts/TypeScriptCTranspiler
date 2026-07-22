let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyConditionalCondition(): Promise<string> {
    let count = 0;
    do {
        await laterBody("body-" + count);
        count++;
        continue;
    } while (await laterCondition(count < 2) ? await laterCondition(true) : await laterCondition(false));
    return await Promise.resolve(bodyCount + "|done");
}

doBodyConditionalCondition().then((value) => console.log(value));
