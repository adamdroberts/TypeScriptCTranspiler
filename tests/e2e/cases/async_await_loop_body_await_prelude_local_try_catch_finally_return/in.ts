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
let cleaned = 0;

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        const prefix = "prelude";
        try {
            await rejectedLater("body");
        } catch (reason) {
            recovered++;
        } finally {
            cleaned++;
        }
        return await later(prefix + "-" + recovered + "-" + cleaned);
    }
    return await later("done");
}

run().then((value) => console.log(value));
