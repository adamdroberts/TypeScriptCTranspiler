function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of"]) {
        await laterBody(item);
        await laterBody(item + "-second");
        throw await later("of-" + bodyCount + "|" + item);
    }
    return await later("fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { in: "value" };
    for (const key in values) {
        await laterBody(key);
        await laterBody(key + "-second");
        throw await later("in-" + bodyCount + "|" + key);
    }
    return await later("fallthrough");
}

runOf().then((value) => console.log(value), (reason) => console.log(reason));
runIn().then((value) => console.log(value), (reason) => console.log(reason));
