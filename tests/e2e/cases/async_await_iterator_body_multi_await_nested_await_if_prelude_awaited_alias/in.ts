function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        const preludeValue = await later(item + "-pre-one");
        await later(preludeValue + "-pre-two");
        if (await laterBoolean(item === "of-b")) {
            await later(item + "-step");
            return await later(preludeValue + "-return");
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
        const preludeValue = await later(key + "-pre-one");
        await later(preludeValue + "-pre-two");
        if (await laterBoolean(key === "in-b")) {
            await later(key + "-step");
            throw await later(preludeValue + "-throw");
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
