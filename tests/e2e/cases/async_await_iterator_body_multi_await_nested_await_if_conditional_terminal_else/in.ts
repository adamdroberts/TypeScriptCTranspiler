function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        await later(item);
        if (await laterBoolean(item === "of-b")) {
            await later(item + "-step");
            if (item === "of-b") {
                const returnValue = item + "-return";
                return await later(returnValue);
            } else {
                let throwValue: string;
                throwValue = item + "-throw";
                throw await later(throwValue);
            }
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
        if (await laterBoolean(key === "in-b")) {
            await later(key + "-step");
            if (key === "in-b") {
                const throwValue = key + "-throw";
                throw await later(throwValue);
            } else {
                let returnValue: string;
                returnValue = key + "-return";
                return await later(returnValue);
            }
        } else {
            await later(key + "-step");
        }
        continue;
    }
    return await later("in-fallthrough");
}

runOf().then((value) => console.log(value));
runIn().catch((reason) => console.log(reason));
