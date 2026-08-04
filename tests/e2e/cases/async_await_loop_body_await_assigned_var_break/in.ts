function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let last = "";

function laterBody(value: string): Promise<string> {
    last = value;
    return later(value);
}

async function run(): Promise<string> {
    for (let count = 0; await laterCondition(count < 2); count++) {
        var first: string;
        first = await laterBody("first-" + count);
        const second = await laterBody(first + "-second");
        await laterBody(second + "-third");
        break;
    }
    return await later(last + "|done");
}

run().then((value) => console.log(value));
