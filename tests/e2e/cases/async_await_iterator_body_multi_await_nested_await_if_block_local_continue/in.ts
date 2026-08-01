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
let ofBlockCount = 0;
let inBlockCount = 0;

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
    if (value === "of-a-block" || value === "of-b-block") ofBlockCount++;
}

function markIn(value: string): void {
    inMarkerCount++;
    if (value === "in-a-block" || value === "in-b-block") inBlockCount++;
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        await laterOf(item);
        if (await laterBoolean(item === "of-a")) {
            await laterOfAlias(item);
            {
                const branchValue = item + "-block";
                markOf(branchValue);
            }
            await laterOfControl(item);
            markOf(item);
        } else {
            await laterOfAlias(item);
            {
                let branchValue = item + "-block";
                markOf(branchValue);
            }
            await laterOfControl(item);
            markOf(item);
        }
        continue;
    }
    return await later(ofCount + "|" + ofControlCount + "|" + ofMarkerCount + "|" + ofBlockCount);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await laterIn(key);
        if (await laterBoolean(key === "in-a")) {
            await laterInAlias(key);
            {
                const branchValue = key + "-block";
                markIn(branchValue);
            }
            await laterInControl(key);
            markIn(key);
        } else {
            await laterInAlias(key);
            {
                let branchValue = key + "-block";
                markIn(branchValue);
            }
            await laterInControl(key);
            markIn(key);
        }
        continue;
    }
    return await later(inCount + "|" + inControlCount + "|" + inMarkerCount + "|" + inBlockCount);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
