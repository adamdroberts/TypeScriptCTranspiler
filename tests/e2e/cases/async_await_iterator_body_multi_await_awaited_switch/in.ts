function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterKey(value: string): Promise<string> {
    return later(value);
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
        switch (await laterKey(item)) {
            case "of-a":
                lastOf = second + "-continue";
                continue;
            default:
                lastOf = second + "-break";
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
        switch (await laterKey(key)) {
            case "in-a":
                lastIn = second + "-continue";
                continue;
            default:
                lastIn = second + "-break";
                break;
        }
    }
    return await later(inCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
