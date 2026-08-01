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

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        await later(item);
        if (await laterBoolean(item === "of-b")) {
            await laterOfStep(item);
            {
                var directValue = item + "-return";
                return await later(directValue);
            }
        } else {
            await laterOfStep(item);
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await later(key);
        if (await laterBoolean(key === "in-b")) {
            await laterInStep(key);
            {
                var directValue: string;
                directValue = key + "-throw";
                throw await later(directValue);
            }
        } else {
            await laterInStep(key);
        }
        continue;
    }
    return await later("in-fallthrough");
}

runOf().then((value) => console.log(value));
runIn().catch((reason) => console.log(reason));
