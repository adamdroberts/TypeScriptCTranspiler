function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let tryPostlude = 0;
let catchPostlude = 0;
let finallyPostlude = 0;

function recover(value: string): Promise<string> {
    return later(value);
}

function cleanup(value: string): Promise<string> {
    return later(value);
}

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        try {
            await later("body");
            tryPostlude++;
        } catch (reason) {
            await recover("recover-" + reason);
            catchPostlude++;
        } finally {
            await cleanup("cleanup");
            finallyPostlude++;
        }
        throw await later("post-" + tryPostlude + "-" + catchPostlude + "-" + finallyPostlude);
    }
    return await later("done");
}

run().then(
    (value) => console.log("unexpected:" + value),
    (error) => console.log("caught:" + error),
);
