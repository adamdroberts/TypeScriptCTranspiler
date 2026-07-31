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
        const first = await laterBody(item);
        const second = await laterBody(first + "-second");
        return await later(bodyCount + "|" + second + "|return");
    }
    return await later("fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { in: "value" };
    for (const key in values) {
        const first = await laterBody(key);
        const second = await laterBody(first + "-second");
        return await later(bodyCount + "|" + second + "|return");
    }
    return await later("fallthrough");
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
