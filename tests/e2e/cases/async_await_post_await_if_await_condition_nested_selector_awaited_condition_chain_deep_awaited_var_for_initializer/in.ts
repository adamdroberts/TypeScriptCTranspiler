let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("deep-nested-selector-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "deep-nested-selector-thrown";
}

async function deepNestedSelectorAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("deep-nested-selector-first");
    if (await laterBoolean(route > 0 && route < 3)) {
        if (route === 1) {
            if (await laterBoolean(true)) {
                if (await laterBoolean(true)) {
                    if (await laterBoolean(true)) {
                        for (var escaped = await laterString(first + "-true"), label = first + "-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-true-third-false"), label = first + "-true-third-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                } else {
                    if (await laterBoolean(false)) {
                        for (var escaped = await laterString(first + "-true-second-false-third-true"), label = first + "-true-second-false-third-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-true-second-false"), label = first + "-true-second-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    if (await laterBoolean(true)) {
                        for (var escaped = await laterString(first + "-false-second-true-third-true"), label = first + "-false-second-true-third-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-false-second-true"), label = first + "-false-second-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                } else {
                    if (await laterBoolean(false)) {
                        for (var escaped = await laterString(first + "-false"), label = first + "-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-false-third-false"), label = first + "-false-third-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                }
            }
        } else {
            if (await laterBoolean(false)) {
                if (await laterBoolean(true)) {
                    if (await laterBoolean(false)) {
                        for (var escaped = await laterString(first + "-alternate-first-true-second-true"), label = first + "-alternate-first-true-second-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-alternate-first-true-second-true-third-false"), label = first + "-alternate-first-true-second-true-third-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                } else {
                    if (await laterBoolean(true)) {
                        for (var escaped = await laterString(first + "-alternate-first-false-second-true"), label = first + "-alternate-first-false-second-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-alternate-first-false-second-false"), label = first + "-alternate-first-false-second-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    if (await laterBoolean(true)) {
                        for (var escaped = await laterString(first + "-alternate-false-first-true-second-true"), label = first + "-alternate-false-first-true-second-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-alternate-false-first-true-second-false"), label = first + "-alternate-false-first-true-second-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                } else {
                    if (await laterBoolean(false)) {
                        for (var escaped = await laterString(first + "-alternate-false"), label = first + "-alternate-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-alternate-false-third-false"), label = first + "-alternate-false-third-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        throw await laterString(first + "-condition-false");
    }
}

async function deepNestedSelectorConditionReject(): Promise<string> {
    const first = await laterString("deep-nested-selector-reject-first");
    if (await laterBoolean(true)) {
        if (true) {
            if (await laterBoolean(true)) {
                if (await laterBoolean(true)) {
                    if (await rejectedBoolean()) {
                        for (var escaped = await laterString(first + "-unexpected"), label = first + "-unexpected-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-fallback"), label = first + "-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                } else {
                    if (await laterBoolean(false)) {
                        for (var escaped = await laterString(first + "-second-false"), label = first + "-second-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-second-fallback"), label = first + "-second-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                }
            } else {
                if (await laterBoolean(false)) {
                    if (await laterBoolean(true)) {
                        for (var escaped = await laterString(first + "-first-false-second-true"), label = first + "-first-false-second-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-first-false-second-false"), label = first + "-first-false-second-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                } else {
                    if (await laterBoolean(false)) {
                        for (var escaped = await laterString(first + "-first-false-third-true"), label = first + "-first-false-third-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    } else {
                        for (var escaped = await laterString(first + "-first-false"), label = first + "-first-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                    }
                }
            }
        } else {
            if (await laterBoolean(false)) {
                if (await laterBoolean(true)) {
                    for (var escaped = await laterString(first + "-selector-false"), label = first + "-selector-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-selector-false-fallback"), label = first + "-selector-false-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            } else {
                if (await laterBoolean(false)) {
                    for (var escaped = await laterString(first + "-selector-false-second"), label = first + "-selector-false-second-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-selector-false-final"), label = first + "-selector-false-final-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        return await laterString(first + "-condition-false");
    }
}

async function deepNestedSelectorSelectorReject(): Promise<string> {
    const first = await laterString("deep-nested-selector-selector-first");
    if (await laterBoolean(true)) {
        if (failSelector("selector:" + first)) {
            if (await laterBoolean(true)) {
                if (await laterBoolean(true)) {
                    for (var escaped = await laterString(first + "-true"), label = first + "-true-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-true-fallback"), label = first + "-true-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            } else {
                if (await laterBoolean(false)) {
                    for (var escaped = await laterString(first + "-false"), label = first + "-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-false-fallback"), label = first + "-false-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            }
        } else {
            if (await laterBoolean(false)) {
                if (await laterBoolean(true)) {
                    for (var escaped = await laterString(first + "-alternate"), label = first + "-alternate-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-alternate-fallback"), label = first + "-alternate-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            } else {
                if (await laterBoolean(false)) {
                    for (var escaped = await laterString(first + "-alternate-false"), label = first + "-alternate-false-label", repeats = 0; repeats < 1; repeats++) mark(label);
                } else {
                    for (var escaped = await laterString(first + "-alternate-false-fallback"), label = first + "-alternate-false-fallback-label", repeats = 0; repeats < 1; repeats++) mark(label);
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        return await laterString(first + "-condition-false");
    }
}

deepNestedSelectorAwaitedVarForInitializer(1).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
deepNestedSelectorAwaitedVarForInitializer(2).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
deepNestedSelectorAwaitedVarForInitializer(0).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-false", reason),
);
deepNestedSelectorConditionReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
deepNestedSelectorSelectorReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 50);
