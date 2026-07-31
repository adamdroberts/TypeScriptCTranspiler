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
        if (item === "of-a") {
            const prefix = "of-await-throw";
            const controlValue = await laterControl(second);
            throw await later(prefix + "|" + controlValue);
        } else {
            throw await later("of-default");
        }
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a" };
    for (const key in values) {
        const first = await laterBody(key);
        const second = await laterBody(first + "-second");
        if (key === "in-a") {
            const prefix = "in-await-throw";
            const controlValue = await laterControl(second);
            throw await later(prefix + "|" + controlValue);
        } else {
            throw await later("in-default");
        }
    }
    return await later("in-fallthrough");
}

async function runDirectOf(): Promise<string> {
    for (const item of ["of-direct"]) {
        const first = await laterBody(item);
        const second = await laterBody(first + "-second");
        throw await later("of-direct-await-throw|" + second);
    }
    return await later("of-direct-fallthrough");
}

async function runDirectIn(): Promise<string> {
    const values: Record<string, string> = { "in-direct": "a" };
    for (const key in values) {
        const first = await laterBody(key);
        const second = await laterBody(first + "-second");
        throw await later("in-direct-await-throw|" + second);
    }
    return await later("in-direct-fallthrough");
}

runOf().then((value) => console.log("fulfilled|" + value), (reason) => console.log(reason));
runIn().then((value) => console.log("fulfilled|" + value), (reason) => console.log(reason));
runDirectOf().then((value) => console.log("fulfilled|" + value), (reason) => console.log(reason));
runDirectIn().then((value) => console.log("fulfilled|" + value), (reason) => console.log(reason));
