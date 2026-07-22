let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

async function forOfBodyAwaitBreak(): Promise<string> {
    for (const item of ["a", "b"]) {
        await laterBody(item);
        break;
    }
    return await Promise.resolve(bodyCount + "|done");
}

forOfBodyAwaitBreak().then((value) => console.log(value));
