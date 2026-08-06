let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-interstitial-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-interstitial-selector-thrown";
}

async function awaitedIfNestedAssignedVarInterstitial(route: number): Promise<string> {
    const first = await laterString("nested-interstitial-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            var truePrefix: string;
            var escaped: string;
            if (route === 1) mark("before-true");
            truePrefix = first + "-true-prefix";
            mark(truePrefix);
            escaped = truePrefix + "-final";
            mark(escaped);
        } else {
            var escaped: string;
            let otherPrefix: string;
            let otherLabel: string;
            mark("before-other");
            otherPrefix = first + "-other-prefix";
            mark(otherPrefix);
            otherLabel = otherPrefix + "-final";
            mark(otherLabel);
            escaped = otherLabel;
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var falsePrefix: string;
            var escapedThrow: string;
            if (route === 2) mark("before-false");
            falsePrefix = first + "-false-prefix";
            mark(falsePrefix);
            escapedThrow = falsePrefix + "-final";
            mark(escapedThrow);
        } else {
            var escapedThrow: string;
            let otherFalsePrefix: string;
            let otherFalseLabel: string;
            mark("before-other-false");
            otherFalsePrefix = first + "-other-false-prefix";
            mark(otherFalsePrefix);
            otherFalseLabel = otherFalsePrefix + "-final";
            mark(otherFalseLabel);
            escapedThrow = otherFalseLabel;
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarInterstitial(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarInterstitial(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarInterstitial(3).then((value) => console.log("return", value));
async function awaitedIfNestedAssignedVarInterstitialReject(): Promise<string> {
    const first = await laterString("nested-interstitial-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var label: string;
            mark("before-reject");
            label = first + "-true";
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            mark("before-reject-false");
            falseLabel = first + "-false";
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarInterstitialThrow(): Promise<string> {
    const first = await laterString("nested-interstitial-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var label: string;
            mark("before-selector");
            label = first + "-true";
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            mark("before-selector-false");
            falseLabel = first + "-false";
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarInterstitialReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarInterstitialThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
