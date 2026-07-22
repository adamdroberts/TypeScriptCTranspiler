let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyNestedLoopControlContinue(): Promise<string> {
    let count = 0;
    do {
        for (let index = 0; index < 3; index++) {
            if (index === 0) {
                continue;
            }
            if (index === 2) {
                break;
            }
            count++;
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyNestedLoopControlContinue().then((value) => console.log(value));
