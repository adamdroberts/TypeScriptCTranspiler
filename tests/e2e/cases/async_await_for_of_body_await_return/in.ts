let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterResult(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forOfBodyAwaitReturn(): Promise<string> {
    for (const item of ["a", "b"]) {
        let bodyValue: string;
        bodyValue = await laterBody(item);
        return await laterResult(bodyCount + "|" + bodyValue + "|returned");
    }
    return await laterResult("fallthrough");
}

forOfBodyAwaitReturn().then((value) => console.log(value));
