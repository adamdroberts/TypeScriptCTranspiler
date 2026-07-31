function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        var first: string;
        first = await laterBody(item);
        continue;
    }
    return await later(bodyCount + "|done");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        var first: string;
        first = await laterBody(key);
        continue;
    }
    return await later(bodyCount + "|done");
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
