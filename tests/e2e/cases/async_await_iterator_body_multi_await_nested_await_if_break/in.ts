function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let ofTruePrelude = 0;
let ofTrueControl = 0;
let ofFalsePrelude = 0;
let ofFalseControl = 0;
let inTruePrelude = 0;
let inTrueControl = 0;
let inFalsePrelude = 0;
let inFalseControl = 0;

function laterOfTrue(value: string): Promise<string> {
    ofTruePrelude++;
    return later(value);
}

function laterOfTrueControl(value: string): Promise<string> {
    ofTrueControl++;
    return later(value);
}

function laterOfFalse(value: string): Promise<string> {
    ofFalsePrelude++;
    return later(value);
}

function laterOfFalseControl(value: string): Promise<string> {
    ofFalseControl++;
    return later(value);
}

function laterInTrue(value: string): Promise<string> {
    inTruePrelude++;
    return later(value);
}

function laterInTrueControl(value: string): Promise<string> {
    inTrueControl++;
    return later(value);
}

function laterInFalse(value: string): Promise<string> {
    inFalsePrelude++;
    return later(value);
}

function laterInFalseControl(value: string): Promise<string> {
    inFalseControl++;
    return later(value);
}

async function runOfTrue(): Promise<string> {
    for (const item of ["of-a"]) {
        await laterOfTrue(item);
        if (await laterBoolean(true)) {
            await laterOfTrueControl(item);
        } else {
            await laterOfTrueControl(item);
        }
        break;
    }
    return await later(ofTruePrelude + "|" + ofTrueControl);
}

async function runOfFalse(): Promise<string> {
    for (const item of ["of-b"]) {
        await laterOfFalse(item);
        if (await laterBoolean(false)) {
            await laterOfFalseControl(item);
        } else {
            await laterOfFalseControl(item);
        }
        break;
    }
    return await later(ofFalsePrelude + "|" + ofFalseControl);
}

async function runInTrue(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a" };
    for (const key in values) {
        await laterInTrue(key);
        if (await laterBoolean(true)) {
            await laterInTrueControl(key);
        } else {
            await laterInTrueControl(key);
        }
        break;
    }
    return await later(inTruePrelude + "|" + inTrueControl);
}

async function runInFalse(): Promise<string> {
    const values: Record<string, string> = { "in-b": "b" };
    for (const key in values) {
        await laterInFalse(key);
        if (await laterBoolean(false)) {
            await laterInFalseControl(key);
        } else {
            await laterInFalseControl(key);
        }
        break;
    }
    return await later(inFalsePrelude + "|" + inFalseControl);
}

runOfTrue().then((value) => console.log("of-true:" + value));
runOfFalse().then((value) => console.log("of-false:" + value));
runInTrue().then((value) => console.log("in-true:" + value));
runInFalse().then((value) => console.log("in-false:" + value));
