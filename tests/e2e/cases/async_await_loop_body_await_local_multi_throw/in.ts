function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let middle = "";

function laterBody(value: string): Promise<string> {
    return later(value);
}

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        const first = await laterBody("first-" + count);
        middle = first + "-middle";
        const second = await laterBody(first + "-second");
        await laterBody(second + "-third");
        throw await later(second + "-throw-" + middle);
    }
    return await later("done");
}

run().then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
