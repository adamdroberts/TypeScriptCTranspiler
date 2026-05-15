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

numberValue().then((value: number): void => {
    console.log("number:", value);
});

stringValue().then((value: string): void => {
    console.log("string:", value);
});

evaluatedOnce().then((value: number): void => {
    console.log("once:", value, sideEffect);
});
