async function plusOne(): Promise<number> {
    const base = await Promise.resolve(4);
    return base + 1;
}

async function exclaim(): Promise<string> {
    const value = await Promise.resolve("ready");
    return value + "!";
}

async function rejected(): Promise<string> {
    await Promise.reject("bad");
    return "never";
}

async function pending(): Promise<string> {
    const value = await new Promise<string>((resolve, reject) => {
        const marker = "idle";
    });
    return value;
}

plusOne().then((value: number): void => {
    console.log("plus:", value);
});

exclaim().then((value: string): void => {
    console.log("exclaim:", value);
});

rejected().catch((reason: string): string => {
    console.log("rejected:", reason);
    return "recovered";
}).then((value: string): void => {
    console.log("after reject:", value);
});

const calls: string[] = [];
pending().then((value: string): void => {
    calls.push("then:" + value);
}).catch((reason: string): void => {
    calls.push("catch:" + reason);
});
console.log("pending calls:", calls.length);
