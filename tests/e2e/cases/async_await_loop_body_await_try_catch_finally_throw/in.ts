function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let fulfilled = 0;
let caught = 0;
let cleaned = 0;

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        try {
            await later("body");
            fulfilled++;
        } catch {
            caught++;
        } finally {
            cleaned++;
        }
        throw await later("thrown-" + fulfilled + "-" + caught + "-" + cleaned);
    }
    return await later("done");
}

run().then(
    (value) => console.log("unexpected:" + value),
    (error) => console.log("caught:" + error),
);
