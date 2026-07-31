function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBody(value: string): Promise<string> {
    return later(value);
}

function laterControl(value: string): Promise<string> {
    return later(value);
}

async function runOfIf(): Promise<string | undefined> {
    for (const item of ["of-if"]) {
        const first = await laterBody(item);
        const second = await laterBody(first + "-second");
        if (item === "of-if") {
            await laterControl(second);
            return;
        } else {
            await laterControl(second);
            return;
        }
    }
    return await later("of-if-fallthrough");
}

async function runInSwitch(): Promise<string | undefined> {
    const values: Record<string, string> = { "in-switch": "a" };
    for (const key in values) {
        const first = await laterBody(key);
        const second = await laterBody(first + "-second");
        switch (key) {
            case "in-switch":
                await laterControl(second);
                return;
            default:
                return;
        }
    }
    return await later("in-switch-fallthrough");
}

async function runDirectOf(): Promise<string | undefined> {
    for (const item of ["of-direct"]) {
        const first = await laterBody(item);
        await laterBody(first + "-second");
        return;
    }
    return await later("of-direct-fallthrough");
}

async function runDirectIn(): Promise<string | undefined> {
    const values: Record<string, string> = { "in-direct": "a" };
    for (const key in values) {
        const first = await laterBody(key);
        await laterBody(first + "-second");
        return;
    }
    return await later("in-direct-fallthrough");
}

runOfIf().then((_value) => console.log("of-if"), (reason) => console.log("reject|" + reason));
runInSwitch().then((_value) => console.log("in-switch"), (reason) => console.log("reject|" + reason));
runDirectOf().then((_value) => console.log("of-direct"), (reason) => console.log("reject|" + reason));
runDirectIn().then((_value) => console.log("in-direct"), (reason) => console.log("reject|" + reason));
