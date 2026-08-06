function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfThrow(flag: boolean): Promise<string> {
    const first = await laterString("throw-first");
    if (await laterBoolean(flag)) {
        throw await laterString(first + "-true-error");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfThrow(true).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfThrow(false).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
