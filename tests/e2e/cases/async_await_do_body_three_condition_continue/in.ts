let bodyCount = 0;

function later(value: string): Promise<string> {
    return Promise.resolve(value);
}

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyThreeCondition(): Promise<string> {
    let count = 0;
    do {
        await laterBody("body-" + count);
        count++;
        continue;
    } while (await laterCondition(count < 3) && await laterCondition(true) && await laterCondition(true));
    return await Promise.resolve(bodyCount + "|done");
}

doBodyThreeCondition().then((value) => console.log(value));
