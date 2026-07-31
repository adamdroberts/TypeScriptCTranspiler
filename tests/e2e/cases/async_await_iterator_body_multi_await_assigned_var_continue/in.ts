function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let bodyCount = 0;
let lastOf = "";
let lastIn = "";

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        var first: string;
        first = await laterBody(item);
        const marker = first + "-second";
        var second: string;
        second = await laterBody(marker);
        lastOf = second;
        continue;
    }
    return await later(bodyCount + "|" + lastOf);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        var first: string;
        first = await laterBody(key);
        const marker = first + "-second";
        var second: string;
        second = await laterBody(marker);
        lastIn = second;
        continue;
    }
    return await later(bodyCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
