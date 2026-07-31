function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let controlCount = 0;
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

function laterControl(value: string): Promise<string> {
    controlCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        var first: string;
        first = await laterOf(item);
        const marker = first + "-second";
        var second: string;
        second = await laterOf(marker);
        switch (item) {
            case "of-a":
                lastOf = second + "-continue";
                await laterControl(lastOf);
                lastOf = lastOf + "-between";
                await laterControl(lastOf);
                lastOf = lastOf + "-post";
                continue;
            default:
                lastOf = second + "-break";
                await laterControl(lastOf);
                lastOf = lastOf + "-between";
                await laterControl(lastOf);
                lastOf = lastOf + "-post";
                break;
        }
    }
    return await later(ofCount + "|" + controlCount + "|" + lastOf);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        var first: string;
        first = await laterIn(key);
        const marker = first + "-second";
        var second: string;
        second = await laterIn(marker);
        switch (key) {
            case "in-a":
                lastIn = second + "-continue";
                await laterControl(lastIn);
                lastIn = lastIn + "-between";
                await laterControl(lastIn);
                lastIn = lastIn + "-post";
                continue;
            default:
                lastIn = second + "-break";
                await laterControl(lastIn);
                lastIn = lastIn + "-between";
                await laterControl(lastIn);
                lastIn = lastIn + "-post";
                break;
        }
    }
    return await later(inCount + "|" + controlCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
