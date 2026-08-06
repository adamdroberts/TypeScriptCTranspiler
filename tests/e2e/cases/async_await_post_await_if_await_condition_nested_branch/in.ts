function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfNestedBranch(route: number): Promise<string> {
    const first = await laterString("nested-first");
    if (await laterBoolean(route !== 3)) {
        if (await laterBoolean(route === 2)) {
            return await laterString(first + "-nested-return");
        } else {
            throw await laterString(first + "-nested-throw");
        }
    } else {
        return await laterString(first + "-outer-false");
    }
}

awaitedIfNestedBranch(1).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("nested-throw", reason),
);
awaitedIfNestedBranch(2).then((value) => console.log("nested-return", value));
awaitedIfNestedBranch(3).then((value) => console.log("outer-false", value));
