let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function mark(value: string): void {
    trace += value + "|";
}

async function recursiveSelectorAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("recursive-selector-first");
    if (await laterBoolean(route > 0 && route < 5)) {
        if (route === 1) {
            if (route === 1) {
                if (route === 1) {
                    for (var escaped = await laterString(first + "-first"), label = first + "-first-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-first-second"), label = first + "-first-second-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            } else {
                if (route === 1) {
                    for (var escaped = await laterString(first + "-first-third"), label = first + "-first-third-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-first-fourth"), label = first + "-first-fourth-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            }
        } else {
            if (route === 2) {
                if (route === 2) {
                    for (var escaped = await laterString(first + "-second"), label = first + "-second-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-second-fallback"), label = first + "-second-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            } else {
                if (route === 3) {
                    for (var escaped = await laterString(first + "-third"), label = first + "-third-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-fourth"), label = first + "-fourth-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        throw await laterString(first + "-condition-false");
    }
}

recursiveSelectorAwaitedVarForInitializer(1).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
recursiveSelectorAwaitedVarForInitializer(2).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
recursiveSelectorAwaitedVarForInitializer(3).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
recursiveSelectorAwaitedVarForInitializer(4).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
recursiveSelectorAwaitedVarForInitializer(0).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-false", reason),
);
setTimeout(() => console.log("trace", trace), 50);
