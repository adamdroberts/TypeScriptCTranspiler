function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function isOfB(value: string): boolean {
    return value === "of-b";
}

function isInB(value: string): boolean {
    return value === "in-b";
}

async function runOfReturn(): Promise<string> {
    for (const item of ["of-a", "of-b", "of-c"]) {
        await later(item);
        if (await laterBoolean(item !== "of-a")) {
            await later(item + "-step");
            if (item !== "of-c") {
                if (isOfB(item)) return await later(item + "-return");
            } else {
                if (isOfB(item)) throw await later(item + "-throw");
            }
        } else {
            await later(item + "-step");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runOfFallthrough(): Promise<string> {
    for (const item of ["of-a", "of-c"]) {
        await later(item);
        if (await laterBoolean(item !== "of-a")) {
            await later(item + "-step");
            if (item !== "of-c") {
                if (isOfB(item)) return await later(item + "-return");
            } else {
                if (isOfB(item)) throw await later(item + "-throw");
            }
        } else {
            await later(item + "-step");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runInThrow(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b", "in-c": "c" };
    for (const key in values) {
        await later(key);
        if (await laterBoolean(key !== "in-a")) {
            await later(key + "-step");
            if (key !== "in-c") {
                if (isInB(key)) throw await later(key + "-throw");
            } else {
                if (isInB(key)) return await later(key + "-return");
            }
        } else {
            await later(key + "-step");
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
            await later(key + "-step");
            if (key !== "in-c") {
                if (isInB(key)) throw await later(key + "-throw");
            } else {
                if (isInB(key)) return await later(key + "-return");
            }
        } else {
            await later(key + "-step");
        }
        continue;
    }
    return await later("in-fallthrough");
}

runOfReturn().then((value) => console.log("of-return:" + value));
runOfFallthrough().then((value) => console.log("of-fallthrough:" + value));
runInThrow().catch((reason) => console.log("in-throw:" + reason));
runInFallthrough().then((value) => console.log("in-fallthrough:" + value));
