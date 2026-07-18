async function numberValue(): Promise<number> {
    const value = await 9;
    return value + 1;
}

async function stringValue(): Promise<string> {
    const label = await "ready";
    return label + "!";
}

let sideEffect = 0;
function nextValue(): number {
    sideEffect += 1;
    return 41;
}

async function evaluatedOnce(): Promise<number> {
    const value = await nextValue();
    return value + sideEffect;
}

async function dynamicPromise(): Promise<string> {
    const promise: any = Promise.resolve("dynamic");
    const value = await promise;
    return value + "!";
}

async function dynamicLeadingChain(): Promise<string> {
    const prefix = "dynamic leading";
    const source: any = Promise.resolve("first");
    const first = await source;
    const second = await Promise.resolve(first + ":second");
    const third = await Promise.resolve(second + ":third");
    const fourth = await Promise.resolve(third + ":fourth");
    const fifth = await Promise.resolve(fourth + ":fifth");
    return prefix + ": " + fifth;
}

numberValue().then((value: number): void => {
    console.log("number:", value);
});

stringValue().then((value: string): void => {
    console.log("string:", value);
});

evaluatedOnce().then((value: number): void => {
    console.log("once:", value, sideEffect);
});

dynamicPromise().then((value: string): void => {
    console.log("dynamic promise:", value);
});

dynamicLeadingChain().then((value: string): void => {
    console.log(value);
});
