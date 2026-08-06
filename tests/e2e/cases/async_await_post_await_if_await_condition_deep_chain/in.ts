function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfDeepChain(route: number): Promise<string> {
    const first = await laterString("deep-first");
    if (await laterBoolean(route === 1)) {
        return await laterString(first + "-one");
    } else if (await laterBoolean(route === 2)) {
        return await laterString(first + "-two");
    } else if (await laterBoolean(route === 3)) {
        throw await laterString(first + "-three-error");
    } else {
        return await laterString(first + "-other");
    }
}

awaitedIfDeepChain(1).then((value) => console.log("one", value));
awaitedIfDeepChain(2).then((value) => console.log("two", value));
awaitedIfDeepChain(3).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("three", reason),
);
awaitedIfDeepChain(4).then((value) => console.log("other", value));
