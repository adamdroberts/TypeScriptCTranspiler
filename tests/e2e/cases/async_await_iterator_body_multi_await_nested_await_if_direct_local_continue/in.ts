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
let ofDirectCount = 0;
let inDirectCount = 0;

function laterOfAlias(value: string): Promise<string> {
    return later(value + "-alias");
}

function laterInAlias(value: string): Promise<string> {
    return later(value + "-alias");
}

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

function markOf(value: string): void {
    ofMarkerCount++;
    if (value === "of-a-direct" || value === "of-b-direct") ofDirectCount++;
}

function markIn(value: string): void {
    inMarkerCount++;
    if (value === "in-a-direct" || value === "in-b-direct") inDirectCount++;
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        await laterOf(item);
        if (await laterBoolean(item === "of-a")) {
            await laterOfAlias(item);
            const directValue = item + "-direct";
            markOf(directValue);
            await laterOfControl(item);
            markOf(directValue);
        } else {
            await laterOfAlias(item);
            let directValue: string;
            directValue = item + "-direct";
            markOf(directValue);
            await laterOfControl(item);
            markOf(directValue);
        }
        continue;
    }
    return await later(ofCount + "|" + ofControlCount + "|" + ofMarkerCount + "|" + ofDirectCount);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await laterIn(key);
        if (await laterBoolean(key === "in-a")) {
            await laterInAlias(key);
            const directValue = key + "-direct";
            markIn(directValue);
            await laterInControl(key);
            markIn(directValue);
        } else {
            await laterInAlias(key);
            let directValue: string;
            directValue = key + "-direct";
            markIn(directValue);
            await laterInControl(key);
            markIn(directValue);
        }
        continue;
    }
    return await later(inCount + "|" + inControlCount + "|" + inMarkerCount + "|" + inDirectCount);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
