function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedLater(value: string): Promise<string> {
    return new Promise<string>((resolve, reject) => setImmediate(() => reject(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let recovered = 0;
let firstCleanup = 0;
let secondCleanup = 0;

function recover(value: string): Promise<string> {
    return later(value);
}

function cleanup(value: string): Promise<string> {
    return later(value);
}

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        try {
            await rejectedLater("body");
        } catch (reason) {
            await recover("recover-" + reason);
            recovered++;
        } finally {
            await cleanup("first");
            firstCleanup++;
            await cleanup("second");
            secondCleanup++;
        }
        throw await later(recovered + "-" + firstCleanup + "-" + secondCleanup);
    }
    return await later("done");
}

run().then(
    (value) => console.log("unexpected:" + value),
    (error) => console.log("caught:" + error),
);
