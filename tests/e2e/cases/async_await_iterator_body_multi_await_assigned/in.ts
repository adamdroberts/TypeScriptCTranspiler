function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

async function runReturn(): Promise<string> {
    for (const item of ["of"]) {
        let first: string;
        first = await laterBody(item);
        let second: string;
        second = await laterBody(first + "-second");
        return await later(bodyCount + "|" + second + "|return");
    }
    return await later("fallthrough");
}

async function runThrow(): Promise<string> {
    const values: Record<string, string> = { in: "value" };
    for (const key in values) {
        let first: string;
        first = await laterBody(key);
        let second: string;
        second = await laterBody(first + "-second");
        throw await later("in-" + bodyCount + "|" + second);
    }
    return await later("fallthrough");
}

runReturn().then((value) => console.log(value));
runThrow().then((value) => console.log(value), (reason) => console.log(reason));
