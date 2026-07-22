let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodySwitchContinue(): Promise<string> {
    let count = 0;
    do {
        switch (count) {
            case 0:
                count += 1;
                break;
            default:
                count += 1;
                break;
        }
        await laterBody("body-" + count);
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|done");
}

doBodySwitchContinue().then((value) => console.log(value));
