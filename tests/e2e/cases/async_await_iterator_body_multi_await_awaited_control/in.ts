function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let lastOf = "";
let lastIn = "";

function laterOf(value: string): Promise<string> {
    ofCount++;
    return later(value);
}

function laterIn(value: string): Promise<string> {
    inCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        var first: string;
        first = await laterOf(item);
        const marker = first + "-second";
        var second: string;
        second = await laterOf(marker);
        lastOf = second;
        if (await laterBoolean(item === "of-a")) {
            continue;
        } else {
            break;
        }
    }
    return await later(ofCount + "|" + lastOf);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        var first: string;
        first = await laterIn(key);
        const marker = first + "-second";
        var second: string;
        second = await laterIn(marker);
        lastIn = second;
        if (await laterBoolean(key === "in-a")) {
            continue;
        } else {
            break;
        }
    }
    return await later(inCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
