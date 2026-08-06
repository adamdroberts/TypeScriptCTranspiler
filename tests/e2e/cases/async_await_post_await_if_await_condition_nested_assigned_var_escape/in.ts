function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfNestedAssignedVarEscape(route: number): Promise<string> {
    const first = await laterString("nested-assigned-escape-first");
    if (await laterBoolean(route === 1)) {
        if (route === 1) {
            var escaped: string;
            escaped = first + "-true";
        } else {
            var escaped: string;
            escaped = first + "-other";
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var escapedThrow: string;
            escapedThrow = first + "-false";
        } else {
            var escapedThrow: string;
            escapedThrow = first + "-other-false";
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarEscape(1).then((value) => console.log("true", value));
awaitedIfNestedAssignedVarEscape(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
