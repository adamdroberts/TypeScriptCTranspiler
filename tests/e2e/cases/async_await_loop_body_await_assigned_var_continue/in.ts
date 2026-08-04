function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let last = "";

function laterBody(value: string): Promise<string> {
    last = value;
    return later(value);
}

async function run(): Promise<string> {
    while (await laterCondition(count < 2)) {
        var first: string;
        first = await laterBody("first-" + count);
        const second = await laterBody(first + "-second");
        await laterBody(second + "-third");
        count++;
        continue;
    }
    return await later(last + "|" + count);
}

run().then((value) => console.log(value));
