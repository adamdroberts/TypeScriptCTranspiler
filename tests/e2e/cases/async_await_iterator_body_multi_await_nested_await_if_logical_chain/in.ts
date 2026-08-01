function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function shouldNotRun(): Promise<boolean> {
    return new Promise<boolean>((_resolve, reject) => setImmediate(() => reject("short-circuit")));
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-c", "of-b"]) {
        await later(item);
        if (
            await laterBoolean(item !== "of-a") &&
            await laterBoolean(item === "of-b") &&
            await (item === "of-b" ? laterBoolean(true) : shouldNotRun())
        ) {
            await later(item + "-step");
            return await later(item + "-return");
        } else {
            await later(item + "-step");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await later(key);
        if (
            await laterBoolean(key === "in-a") ||
            await laterBoolean(key === "in-b") ||
            await shouldNotRun()
        ) {
            await later(key + "-step");
            throw await later(key + "-throw");
        } else {
            await later(key + "-step");
        }
        continue;
    }
    return await later("in-fallthrough");
}

async function runMixed(): Promise<string> {
    for (const item of ["mixed"]) {
        await later(item);
        if (
            await laterBoolean(false) ||
            await laterBoolean(true) &&
            await laterBoolean(true) ||
            await shouldNotRun()
        ) {
            await later(item + "-step");
            return await later(item + "-return");
        } else {
            await later(item + "-step");
        }
        continue;
    }
    return await later("mixed-fallthrough");
}

runOf()
    .then((value) => {
        console.log(value);
        return runIn();
    })
    .catch((reason) => {
        console.log(reason);
        return runMixed();
    })
    .then((value) => console.log(value));
