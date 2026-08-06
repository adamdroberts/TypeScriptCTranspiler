let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-selector-awaited-condition-chain-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-selector-awaited-condition-chain-thrown";
}

async function nestedSelectorAwaitedConditionChainAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("nested-selector-awaited-condition-chain-first");
    if (await laterBoolean(route > 0 && route < 3)) {
        if (route === 1) {
            if (await laterBoolean(true)) {
                if (await laterBoolean(true)) {
                    for (
                        var escaped = await laterString(first + "-true"),
                            label = first + "-true-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                } else {
                    for (
                        var escaped = await laterString(first + "-true-second"),
                            label = first + "-true-second-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    for (
                        var escaped = await laterString(first + "-false-unselected"),
                            label = first + "-false-unselected-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                } else {
                    for (
                        var escaped = await laterString(first + "-false"),
                            label = first + "-false-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                }
            }
        } else {
            if (await laterBoolean(false)) {
                if (await laterBoolean(true)) {
                    for (
                        var escaped = await laterString(first + "-alternate-unselected"),
                            label = first + "-alternate-unselected-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                } else {
                    for (
                        var escaped = await laterString(first + "-alternate-second"),
                            label = first + "-alternate-second-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    for (
                        var escaped = await laterString(first + "-alternate-false-unselected"),
                            label = first + "-alternate-false-unselected-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                } else {
                    for (
                        var escaped = await laterString(first + "-alternate-false"),
                            label = first + "-alternate-false-label",
                            repeats = 0;
                        repeats < 1;
                        repeats++
                    ) {
                        mark(label);
                    }
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        throw await laterString(first + "-condition-false");
    }
}

async function nestedSelectorAwaitedConditionChainReject(): Promise<string> {
    const first = await laterString("nested-selector-awaited-condition-chain-reject-first");
    if (await laterBoolean(true)) {
        if (true) {
            if (await laterBoolean(true)) {
                if (await rejectedBoolean()) {
                    for (var escaped = await laterString(first + "-true"), label = first + "-true-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-true-fallback"), label = first + "-true-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    for (var escaped = await laterString(first + "-false"), label = first + "-false-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-false-fallback"), label = first + "-false-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            }
        } else {
            if (await laterBoolean(false)) {
                if (await laterBoolean(true)) {
                    for (var escaped = await laterString(first + "-alternate"), label = first + "-alternate-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-alternate-fallback"), label = first + "-alternate-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    for (var escaped = await laterString(first + "-alternate-false"), label = first + "-alternate-false-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-alternate-false-fallback"), label = first + "-alternate-false-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        return await laterString(first + "-condition-false");
    }
}

async function nestedSelectorAwaitedConditionChainSelectorReject(): Promise<string> {
    const first = await laterString("nested-selector-awaited-condition-chain-selector-first");
    if (await laterBoolean(true)) {
        if (failSelector("selector:" + first)) {
            if (await laterBoolean(true)) {
                if (await laterBoolean(true)) {
                    for (var escaped = await laterString(first + "-true"), label = first + "-true-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-true-fallback"), label = first + "-true-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    for (var escaped = await laterString(first + "-false"), label = first + "-false-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-false-fallback"), label = first + "-false-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            }
        } else {
            if (await laterBoolean(false)) {
                if (await laterBoolean(true)) {
                    for (var escaped = await laterString(first + "-alternate"), label = first + "-alternate-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-alternate-fallback"), label = first + "-alternate-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    for (var escaped = await laterString(first + "-alternate-false"), label = first + "-alternate-false-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                } else {
                    for (var escaped = await laterString(first + "-alternate-false-fallback"), label = first + "-alternate-false-fallback-label", repeats = 0; repeats < 1; repeats++) {
                        mark(label);
                    }
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        return await laterString(first + "-condition-false");
    }
}

nestedSelectorAwaitedConditionChainAwaitedVarForInitializer(1).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
nestedSelectorAwaitedConditionChainAwaitedVarForInitializer(2).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
nestedSelectorAwaitedConditionChainAwaitedVarForInitializer(0).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-false", reason),
);
nestedSelectorAwaitedConditionChainReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
nestedSelectorAwaitedConditionChainSelectorReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 50);
