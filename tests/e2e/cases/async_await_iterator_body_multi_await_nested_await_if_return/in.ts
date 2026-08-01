function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterOfPrelude(value: string): Promise<string> {
    return later(value + "-prelude");
}

function laterOfControl(value: string): Promise<string> {
    return later(value + "-control");
}

function laterInPrelude(value: string): Promise<string> {
    return later(value + "-prelude");
}

function laterInControl(value: string): Promise<string> {
    return later(value + "-control");
}

async function runOfTrue(): Promise<string> {
    for (const item of ["of-a"]) {
        await laterOfPrelude(item);
        if (await laterBoolean(true)) {
            await laterOfControl(item);
            return await later("of-return-" + item);
        } else {
            await laterOfControl(item);
        }
        continue;
    }
    return await later("of-fallback");
}

async function runOfFalse(): Promise<string> {
    for (const item of ["of-b"]) {
        await laterOfPrelude(item);
        if (await laterBoolean(false)) {
            await laterOfControl(item);
            return await later("of-return-" + item);
        } else {
            await laterOfControl(item);
        }
        continue;
    }
    return await later("of-fallback");
}

async function runInTrue(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a" };
    for (const key in values) {
        await laterInPrelude(key);
        if (await laterBoolean(true)) {
            await laterInControl(key);
            return await later("in-return-" + key);
        } else {
            await laterInControl(key);
        }
        continue;
    }
    return await later("in-fallback");
}

async function runInFalse(): Promise<string> {
    const values: Record<string, string> = { "in-b": "b" };
    for (const key in values) {
        await laterInPrelude(key);
        if (await laterBoolean(false)) {
            await laterInControl(key);
            return await later("in-return-" + key);
        } else {
            await laterInControl(key);
        }
        continue;
    }
    return await later("in-fallback");
}

runOfTrue().then((value) => console.log("of-true:" + value));
runOfFalse().then((value) => console.log("of-false:" + value));
runInTrue().then((value) => console.log("in-true:" + value));
runInFalse().then((value) => console.log("in-false:" + value));
