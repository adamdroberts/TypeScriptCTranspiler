let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-selector-chain-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-selector-chain-thrown";
}

async function nestedSelectorChainAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("nested-selector-chain-first");
    if (await laterBoolean(route > 0 && route < 5)) {
        if (route === 1) {
            if (route === 1) {
                for (
                    var escapedReturn = await laterString(first + "-return-first"),
                        label = first + "-return-first-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            } else {
                for (
                    var escapedReturn = await laterString(first + "-return-second"),
                        label = first + "-return-second-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            }
        } else {
            if (route === 2) {
                for (
                    var escapedReturn = await laterString(first + "-return-third"),
                        label = first + "-return-third-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            } else {
                for (
                    var escapedReturn = await laterString(first + "-return-fourth"),
                        label = first + "-return-fourth-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            }
        }
        return await laterString(escapedReturn + "-return");
    } else {
        throw await laterString(first + "-condition-false");
    }
}

async function nestedSelectorChainThrowAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("nested-selector-chain-throw-first");
    if (await laterBoolean(route > 0 && route < 3)) {
        if (route === 1) {
            if (route === 1) {
                for (
                    var escapedThrow = await laterString(first + "-throw-first"),
                        label = first + "-throw-first-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            } else {
                for (
                    var escapedThrow = await laterString(first + "-throw-second"),
                        label = first + "-throw-second-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            }
        } else {
            if (route === 2) {
                for (
                    var escapedThrow = await laterString(first + "-throw-third"),
                        label = first + "-throw-third-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            } else {
                for (
                    var escapedThrow = await laterString(first + "-throw-fourth"),
                        label = first + "-throw-fourth-label",
                        repeats = 0;
                    repeats < 1;
                    repeats++
                ) {
                    mark(label);
                }
            }
        }
        throw await laterString(escapedThrow + "-throw");
    } else {
        return await laterString(first + "-condition-false");
    }
}

async function nestedSelectorChainConditionReject(): Promise<string> {
    const first = await laterString("nested-selector-chain-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            for (var label = await laterString(first + "-true"), repeats = 0; repeats < 1; repeats++) {
                mark(label);
            }
        } else {
            for (var falseLabel = await laterString(first + "-false"), repeats = 0; repeats < 1; repeats++) {
                mark(falseLabel);
            }
        }
        return await laterString(first + "-return");
    } else {
        throw await laterString(first + "-throw");
    }
}

async function nestedSelectorChainSelectorReject(): Promise<string> {
    const first = await laterString("nested-selector-chain-selector-first");
    if (await laterBoolean(true)) {
        if (true) {
            if (failSelector("selector:" + first)) {
                for (var label = await laterString(first + "-true"), repeats = 0; repeats < 1; repeats++) {
                    mark(label);
                }
            } else {
                for (var falseLabel = await laterString(first + "-false"), repeats = 0; repeats < 1; repeats++) {
                    mark(falseLabel);
                }
            }
        } else {
            if (false) {
                for (var alternateLabel = await laterString(first + "-alternate"), repeats = 0; repeats < 1; repeats++) {
                    mark(repeats + "");
                }
            } else {
                for (var alternateFalseLabel = await laterString(first + "-alternate-false"), repeats = 0; repeats < 1; repeats++) {
                    mark(repeats + "");
                }
            }
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-else");
    }
}

nestedSelectorChainAwaitedVarForInitializer(1).then((value) => console.log("return", value));
nestedSelectorChainAwaitedVarForInitializer(3).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
nestedSelectorChainThrowAwaitedVarForInitializer(1).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
nestedSelectorChainThrowAwaitedVarForInitializer(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
nestedSelectorChainAwaitedVarForInitializer(0).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-false", reason),
);
nestedSelectorChainConditionReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
nestedSelectorChainSelectorReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 30);
