function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;

function laterBody(value: string): Promise<string> {
    return later(value);
}

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        var first: string;
        first = await laterBody("first-" + count);
        var second: string;
        second = await laterBody(first + "-second");
        const third = await laterBody(second + "-third");
        throw await later(third + "-throw");
    }
    return await later("done");
}

run().then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
