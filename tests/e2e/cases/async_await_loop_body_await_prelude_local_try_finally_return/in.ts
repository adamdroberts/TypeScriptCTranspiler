function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let cleaned = 0;

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        const prefix = "prelude";
        try {
            await later("body");
        } finally {
            cleaned++;
        }
        return await later(prefix + "-" + cleaned);
    }
    return await later("done");
}

run().then((value) => console.log(value));
