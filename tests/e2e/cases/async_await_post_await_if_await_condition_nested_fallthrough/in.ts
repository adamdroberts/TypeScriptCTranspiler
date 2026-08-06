function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfNestedFallthrough(route: number): Promise<string> {
    const first = await laterString("fallthrough-first");
    if (await laterBoolean(route !== 3)) {
        if (await laterBoolean(route === 2)) {
            return await laterString(first + "-nested-return");
        }
        throw await laterString(first + "-nested-fallthrough-throw");
    } else {
        return await laterString(first + "-outer-false");
    }
}

awaitedIfNestedFallthrough(1).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("fallthrough-throw", reason),
);
awaitedIfNestedFallthrough(2).then((value) => console.log("nested-return", value));
awaitedIfNestedFallthrough(3).then((value) => console.log("outer-false", value));
