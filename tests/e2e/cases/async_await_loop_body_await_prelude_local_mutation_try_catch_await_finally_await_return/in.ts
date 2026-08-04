function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedLater(value: string): Promise<string> {
    return new Promise<string>((resolve, reject) => setImmediate(() => reject(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function recover(value: string): Promise<string> {
    return later(value);
}

function cleanup(value: string): Promise<string> {
    return later(value);
}

let count = 0;

async function run(): Promise<string> {
    while (await laterCondition(count < 1)) {
        let marker = "initial";
        try {
            await rejectedLater("body");
        } catch (reason) {
            await recover("recover-" + reason);
            marker = "recovered";
        } finally {
            await cleanup(marker);
            marker = marker + "-cleanup";
        }
        return await later(marker);
    }
    return await later("done");
}

run().then((value) => console.log(value));
