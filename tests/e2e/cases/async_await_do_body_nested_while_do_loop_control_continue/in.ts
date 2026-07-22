let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyNestedWhileDoLoopControlContinue(): Promise<string> {
    let count = 0;
    do {
        let whileCount = 0;
        while (whileCount < 3) {
            whileCount++;
            if (whileCount === 1) {
                continue;
            }
            if (whileCount === 3) {
                break;
            }
            count++;
        }
        let doCount = 0;
        do {
            doCount++;
            if (doCount === 1) {
                continue;
            }
            if (doCount === 3) {
                break;
            }
            count++;
        } while (doCount < 3);
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 4));
    return await Promise.resolve(bodyCount + "|" + count);
}

doBodyNestedWhileDoLoopControlContinue().then((value) => console.log(value));
