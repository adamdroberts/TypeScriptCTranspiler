function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterOfStep(value: string): Promise<string> {
    return later(value + "-step");
}

function laterInStep(value: string): Promise<string> {
    return later(value + "-step");
}

async function runOfReturn(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        await later(item);
        if (await laterBoolean(item !== "of-a")) {
            await laterOfStep(item);
            if (item !== "of-a") {
                if (item === "of-b") return await later(item + "-return");
            }
        } else {
            await laterOfStep(item);
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runOfFallthrough(): Promise<string> {
    for (const item of ["of-a", "of-c"]) {
        await later(item);
        if (await laterBoolean(item !== "of-a")) {
            await laterOfStep(item);
            if (item !== "of-a") {
                if (item === "of-b") return await later(item + "-return");
            }
        } else {
            await laterOfStep(item);
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runInThrow(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await later(key);
        if (await laterBoolean(key !== "in-a")) {
            await laterInStep(key);
            if (key !== "in-a") {
                if (key === "in-b") throw await later(key + "-throw");
            }
        } else {
            await laterInStep(key);
        }
        continue;
    }
    return await later("in-fallthrough");
}

async function runInFallthrough(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-c": "c" };
    for (const key in values) {
        await later(key);
        if (await laterBoolean(key !== "in-a")) {
            await laterInStep(key);
            if (key !== "in-a") {
                if (key === "in-b") throw await later(key + "-throw");
            }
        } else {
            await laterInStep(key);
        }
        continue;
    }
    return await later("in-fallthrough");
}

runOfReturn().then((value) => console.log("of-return:" + value));
runOfFallthrough().then((value) => console.log("of-fallthrough:" + value));
runInThrow().catch((reason) => console.log("in-throw:" + reason));
runInFallthrough().then((value) => console.log("in-fallthrough:" + value));
