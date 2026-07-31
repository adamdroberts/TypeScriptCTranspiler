function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBody(value: string): Promise<string> {
    return later(value);
}

function laterControl(value: string): Promise<string> {
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a"]) {
        const first = await laterBody(item);
        const second = await laterBody(first + "-second");
        switch (item) {
            case "of-a":
                const prefix = "of-switch-await-return";
                const controlValue = await laterControl(second);
                return await later(prefix + "|" + controlValue);
            default:
                return await later("of-default");
        }
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a" };
    for (const key in values) {
        const first = await laterBody(key);
        const second = await laterBody(first + "-second");
        switch (key) {
            case "in-a":
                const prefix = "in-switch-await-return";
                const controlValue = await laterControl(second);
                return await later(prefix + "|" + controlValue);
            default:
                return await later("in-default");
        }
    }
    return await later("in-fallthrough");
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
