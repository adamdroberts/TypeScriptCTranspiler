let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyNestedIterLoopControlContinue(): Promise<string> {
    let count = 0;
    do {
        for (const item of [0, 1, 2]) {
            if (item === 0) {
                continue;
            }
            if (item === 2) {
                break;
            }
            count += 2;
        }
        for (const key in [10, 20, 30]) {
            if (key === "0") {
                continue;
            }
            if (key === "2") {
                break;
            }
            count++;
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 6));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyNestedIterLoopControlContinue().then((value) => console.log(value));
