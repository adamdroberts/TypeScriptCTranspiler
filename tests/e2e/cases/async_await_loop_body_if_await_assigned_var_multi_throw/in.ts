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
        if (await laterCondition(count === 0)) {
            await laterBody("continue-" + count);
            count++;
            continue;
        } else {
            var first: string;
            first = await laterBody("first-" + count);
            var second: string;
            second = await laterBody(first + "-second");
            throw await later(second + "-throw");
        }
    }
    return await later("done");
}

run().then(
    (value) => console.log(value),
    (reason) => console.log("error:" + reason),
);
