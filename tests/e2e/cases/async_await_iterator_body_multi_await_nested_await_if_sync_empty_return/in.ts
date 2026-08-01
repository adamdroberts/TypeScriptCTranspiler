function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let ofControlCount = 0;
let inControlCount = 0;
let ofMarkerCount = 0;
let inMarkerCount = 0;

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

function markOf(): void {
    ofMarkerCount++;
}

function markIn(): void {
    inMarkerCount++;
}

async function runOf(): Promise<string | undefined> {
    for (const item of ["of-a", "of-b"]) {
        await laterOf(item);
        if (await laterBoolean(item === "of-b")) {
            await laterOfControl(item);
            return;
        } else {
            await laterOfControl(item);
            markOf();
        }
        continue;
    }
    return await later("fallthrough-of-" + ofCount + "|" + ofControlCount + "|" + ofMarkerCount);
}

async function runIn(): Promise<string | undefined> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await laterIn(key);
        if (await laterBoolean(key === "in-b")) {
            await laterInControl(key);
            return;
        } else {
            await laterInControl(key);
            markIn();
        }
        continue;
    }
    return await later("fallthrough-in-" + inCount + "|" + inControlCount + "|" + inMarkerCount);
}

runOf().then((_value) => console.log("of-empty"));
runIn().then((_value) => console.log("in-empty"));
