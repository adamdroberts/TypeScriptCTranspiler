function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfNestedChainFallthrough(route: number): Promise<string> {
    const first = await laterString("chain-fallthrough-first");
    if (await laterBoolean(route !== 4)) {
        if (await laterBoolean(route === 1)) {
            return await laterString(first + "-one");
        } else if (await laterBoolean(route === 2)) {
            return await laterString(first + "-two");
        }
        throw await laterString(first + "-fallback-throw");
    } else {
        return await laterString(first + "-outer-false");
    }
}

awaitedIfNestedChainFallthrough(1).then((value) => console.log("one", value));
awaitedIfNestedChainFallthrough(2).then((value) => console.log("two", value));
awaitedIfNestedChainFallthrough(3).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("fallback-throw", reason),
);
awaitedIfNestedChainFallthrough(4).then((value) => console.log("outer-false", value));
