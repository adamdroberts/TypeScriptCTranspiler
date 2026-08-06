function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfExplicitElse(flag: boolean): Promise<string> {
    const first = await laterString("else-first");
    if (await laterBoolean(flag)) {
        return await laterString(first + "-true");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfExplicitElse(true).then((value) => console.log("true", value));
awaitedIfExplicitElse(false).then((value) => console.log("false", value));
