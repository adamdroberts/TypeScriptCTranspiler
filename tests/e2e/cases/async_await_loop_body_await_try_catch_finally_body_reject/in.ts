function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedLater(value: string): Promise<string> {
    return new Promise<string>((resolve, reject) => setImmediate(() => reject(value)));
}

function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let count = 0;
let caught = 0;
let cleaned = 0;

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        try {
            await rejectedLater("body-rejected");
        } catch (reason) {
            caught += reason === "body-rejected" ? 1 : 0;
        } finally {
            cleaned++;
        }
        return await later("recovered-" + caught + "-" + cleaned);
    }
    return await later("done");
}

run().then((value) => console.log(value));
