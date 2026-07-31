function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;

async function run(): Promise<string> {
    for (; await laterCondition(count < 2);) {
        const first = await later("first-" + count);
        await later("second-" + count);
        count++;
        continue;
    }
    return await later(count + "|done");
}

run().then((value) => console.log(value));
