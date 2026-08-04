function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let firstStage = 0;
let secondStage = 0;
let recovered = 0;
let cleaned = 0;

function recover(value: string): Promise<string> {
    recovered++;
    return later(value);
}

function cleanup(value: string): Promise<string> {
    cleaned++;
    return later(value);
}

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        try {
            await later("first");
            firstStage++;
            await later("second");
            secondStage++;
        } catch (reason) {
            await recover("recover-" + reason);
        } finally {
            await cleanup("cleanup");
        }
        return await later(firstStage + "-" + secondStage + "-" + recovered + "-" + cleaned);
    }
    return await later("done");
}

run().then((value) => console.log(value));
