function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let ofControlCount = 0;
let inControlCount = 0;
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

function laterOfControl(value: string): Promise<string> {
    ofControlCount++;
    return later(value);
}

function laterInControl(value: string): Promise<string> {
    inControlCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        var first: string;
        first = await laterOf(item);
        const marker = first + "-second";
        var second: string;
        second = await laterOf(marker);
        if (item === "of-a") {
            lastOf = second + "-continue";
            const continueSuffix = "-between";
            const continueValue = await laterOfControl(lastOf);
            lastOf = continueValue + continueSuffix;
            await laterOfControl(lastOf);
            lastOf = lastOf + "-post";
            continue;
        } else {
            lastOf = second + "-break";
            const breakSuffix = "-between";
            var breakValue: string;
            breakValue = await laterOfControl(lastOf);
            lastOf = breakValue + breakSuffix;
            await laterOfControl(lastOf);
            lastOf = lastOf + "-post";
            break;
        }
    }
    return await later(ofCount + "|" + ofControlCount + "|" + lastOf);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        var first: string;
        first = await laterIn(key);
        const marker = first + "-second";
        var second: string;
        second = await laterIn(marker);
        if (key === "in-a") {
            lastIn = second + "-continue";
            const continueSuffix = "-between";
            const continueValue = await laterInControl(lastIn);
            lastIn = continueValue + continueSuffix;
            await laterInControl(lastIn);
            lastIn = lastIn + "-post";
            continue;
        } else {
            lastIn = second + "-break";
            const breakSuffix = "-between";
            var breakValue: string;
            breakValue = await laterInControl(lastIn);
            lastIn = breakValue + breakSuffix;
            await laterInControl(lastIn);
            lastIn = lastIn + "-post";
            break;
        }
    }
    return await later(inCount + "|" + inControlCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
