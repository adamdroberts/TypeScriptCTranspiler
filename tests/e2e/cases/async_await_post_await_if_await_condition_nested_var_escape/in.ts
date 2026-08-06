function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfNestedVarEscape(route: number): Promise<string> {
    const first = await laterString("nested-var-escape-first");
    if (await laterBoolean(route === 1)) {
        if (route === 1) {
            var escaped = first + "-true";
        } else {
            var escaped = first + "-other";
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var escapedThrow = first + "-false";
        } else {
            var escapedThrow = first + "-other-false";
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedVarEscape(1).then((value) => console.log("true", value));
awaitedIfNestedVarEscape(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
