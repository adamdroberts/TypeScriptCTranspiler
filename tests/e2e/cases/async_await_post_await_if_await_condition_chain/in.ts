function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

async function awaitedIfElseIf(route: number): Promise<string> {
    const first = await laterString("chain-first");
    if (await laterBoolean(route === 1)) {
        return await laterString(first + "-one");
    } else if (await laterBoolean(route === 2)) {
        return await laterString(first + "-two");
    } else {
        return await laterString(first + "-other");
    }
}

awaitedIfElseIf(1).then((value) => console.log("one", value));
awaitedIfElseIf(2).then((value) => console.log("two", value));
awaitedIfElseIf(3).then((value) => console.log("other", value));
