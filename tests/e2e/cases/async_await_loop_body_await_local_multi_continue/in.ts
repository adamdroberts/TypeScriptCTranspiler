function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let lastValue = "";
let middleValue = "";

function laterBody(value: string): Promise<string> {
    lastValue = value;
    return later(value);
}

async function run(): Promise<string> {
    for (; await laterCondition(count < 2);) {
        const first = await laterBody("first-" + count);
        middleValue = first + "-middle";
        const second = await laterBody(first + "-second");
        await laterBody(second + "-third");
        count++;
        continue;
    }
    return await later(lastValue + "|" + middleValue + "|" + count);
}

run().then((value) => console.log(value));
