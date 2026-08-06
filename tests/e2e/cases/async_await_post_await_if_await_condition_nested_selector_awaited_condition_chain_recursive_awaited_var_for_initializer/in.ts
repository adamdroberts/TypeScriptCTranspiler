let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function fourthCondition(route: number): Promise<boolean> {
    return route === 4
        ? Promise.reject("recursive-nested-selector-condition-rejected")
        : laterBoolean(route === 1);
}

function mark(value: string): void {
    trace += value + "|";
}

async function recursiveNestedSelectorAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("recursive-nested-selector-first");
    if (await laterBoolean(route > 0 && route < 5)) {
        if (route === 1) {
            if (await laterBoolean(route === 1)) {
                if (await laterBoolean(route === 1)) {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-tttt"), label = first + "-true-tttt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-tttf"), label = first + "-true-tttf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-ttft"), label = first + "-true-ttft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-ttff"), label = first + "-true-ttff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                } else {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-tftt"), label = first + "-true-tftt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-tftf"), label = first + "-true-tftf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-tfft"), label = first + "-true-tfft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-tfff"), label = first + "-true-tfff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                }
            } else {
                if (await laterBoolean(route === 1)) {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-fttt"), label = first + "-true-fttt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-fttf"), label = first + "-true-fttf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-ftft"), label = first + "-true-ftft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-ftff"), label = first + "-true-ftff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                } else {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-fftt"), label = first + "-true-fftt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-fftf"), label = first + "-true-fftf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-true-ffft"), label = first + "-true-ffft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-true-ffff"), label = first + "-true-ffff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                }
            }
        } else {
            if (await laterBoolean(route === 1)) {
                if (await laterBoolean(route === 1)) {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-tttt"), label = first + "-alternate-tttt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-tttf"), label = first + "-alternate-tttf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-ttft"), label = first + "-alternate-ttft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-ttff"), label = first + "-alternate-ttff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                } else {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-tftt"), label = first + "-alternate-tftt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-tftf"), label = first + "-alternate-tftf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-tfft"), label = first + "-alternate-tfft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-tfff"), label = first + "-alternate-tfff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                }
            } else {
                if (await laterBoolean(route === 1)) {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-fttt"), label = first + "-alternate-fttt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-fttf"), label = first + "-alternate-fttf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-ftft"), label = first + "-alternate-ftft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-ftff"), label = first + "-alternate-ftff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                } else {
                    if (await laterBoolean(route === 1)) {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-fftt"), label = first + "-alternate-fftt-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-fftf"), label = first + "-alternate-fftf-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    } else {
                        if (await fourthCondition(route)) {
                            for (var escaped = await laterString(first + "-alternate-ffft"), label = first + "-alternate-ffft-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        } else {
                            for (var escaped = await laterString(first + "-alternate-ffff"), label = first + "-alternate-ffff-label", repeats = 0; repeats < 1; repeats++) mark(label);
                        }
                    }
                }
            }
        }
        return await laterString(escaped + "-return");
    } else {
        throw await laterString(first + "-condition-false");
    }
}

recursiveNestedSelectorAwaitedVarForInitializer(1).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
recursiveNestedSelectorAwaitedVarForInitializer(2).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
recursiveNestedSelectorAwaitedVarForInitializer(0).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-false", reason),
);
recursiveNestedSelectorAwaitedVarForInitializer(4).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
setTimeout(() => console.log("trace", trace), 50);
