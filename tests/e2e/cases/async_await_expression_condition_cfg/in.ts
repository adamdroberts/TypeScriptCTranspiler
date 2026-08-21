let conditionCalls = 0;
let nullishCalls = 0;
let mixedSyncCalls = 0;
let mixedAwaitCalls = 0;

function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    conditionCalls++;
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedNumber(): Promise<number> {
    return Promise.reject("condition-rejected");
}

function laterValue(value: any): Promise<any> {
    nullishCalls++;
    return Promise.resolve(value);
}

function laterText(value: string): Promise<string> {
    return Promise.resolve(value);
}

function markMixed(value: boolean): boolean {
    mixedSyncCalls++;
    return value;
}

function settledBoolean(value: boolean): Promise<boolean> {
    mixedAwaitCalls++;
    return Promise.resolve(value);
}

async function embeddedIf(value: number): Promise<string> {
    if ((await laterNumber(value)) + 1 === 3) {
        return "if-true";
    }
    return "if-false";
}

async function embeddedLoop(): Promise<string> {
    let round = 0;
    while (await laterBoolean(round < 2) && await laterBoolean(true)) {
        round++;
    }
    return "loop:" + round + ":calls:" + conditionCalls;
}

async function embeddedReject(): Promise<string> {
    if ((await rejectedNumber()) === 1) {
        return "unexpected-true";
    }
    return "unexpected-false";
}

async function embeddedSwitch(value: number): Promise<string> {
    switch ((await laterNumber(value)) + 1) {
        case 3:
            return "switch-three";
        default:
            return "switch-default";
    }
}

async function embeddedNullish(value: any): Promise<string> {
    if (await laterValue(value) ?? await laterValue("fallback")) {
        return "nullish-true";
    }
    return "nullish-false";
}

async function embeddedStringTruthy(value: string): Promise<string> {
    if (await laterText(value)) {
        return "string-true";
    }
    return "string-false";
}

function makeCallbackCondition(captured: any): () => Promise<string> {
    return async (): Promise<string> => {
        if (await new Promise<boolean>((resolve) => setImmediate(() => {
            captured.value = "callback-changed";
            resolve(true);
        })) && await laterBoolean(true)) {
            return "callback-true";
        }
        return "callback-false";
    };
}

async function mixedBeforeAwait(value: boolean): Promise<string> {
    if (markMixed(value) && await settledBoolean(true)) {
        return "mixed-before-true";
    }
    return "mixed-before-false";
}

async function mixedAfterAwait(value: boolean): Promise<string> {
    if (await settledBoolean(value) && markMixed(true)) {
        return "mixed-after-true";
    }
    return "mixed-after-false";
}

embeddedIf(2).then((value) => console.log(value));
embeddedIf(1).then((value) => console.log(value));
embeddedLoop().then((value) => console.log(value));
embeddedSwitch(2).then((value) => console.log(value));
embeddedNullish(null).then((value) => console.log(value));
embeddedNullish("").then((value) => console.log(value));
embeddedStringTruthy("").then((value) => console.log(value));
embeddedStringTruthy("yes").then((value) => console.log(value));
const callbackMarker: any = { value: "callback-before" };
makeCallbackCondition(callbackMarker)().then((value) => console.log(value));
mixedBeforeAwait(false).then((value) => console.log(value));
mixedBeforeAwait(true).then((value) => console.log(value));
mixedAfterAwait(false).then((value) => console.log(value));
mixedAfterAwait(true).then((value) => console.log(value));
embeddedReject().then(
    (value) => console.log(value),
    (reason) => console.log("reject:" + reason),
);
setTimeout(() => console.log("nullish-calls:" + nullishCalls), 20);
setTimeout(() => console.log("callback-marker:" + callbackMarker.value), 20);
setTimeout(() => console.log("mixed-calls:" + mixedSyncCalls + ":" + mixedAwaitCalls), 20);
