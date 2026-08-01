function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        await later(item);
        if (
            item !== "of-a" &&
            await laterBoolean(item === "of-b") &&
            item === "of-b"
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
            key === "in-a" ||
            await laterBoolean(key === "in-b") ||
            key === "in-b"
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

runOf()
    .then((value) => {
        console.log(value);
        return runIn();
    })
    .catch((reason) => console.log(reason));
