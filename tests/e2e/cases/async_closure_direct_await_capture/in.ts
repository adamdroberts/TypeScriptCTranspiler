function makeAsyncClosure(captured: any): (suffix: string) => Promise<string> {
    const run = async (suffix: string): Promise<string> => {
        const tick = await new Promise<string>((resolve) => setImmediate(() => {
            captured = { value: "rebound" };
            resolve("tick");
        }));
        return captured.value + ":" + tick + ":" + suffix;
    };
    return run;
}

function makeMultiAwaitClosure(captured: any): (firstSource: Promise<string>) => Promise<string> {
    return async (firstSource: Promise<string>): Promise<string> => {
        const first = await firstSource;
        const second = await new Promise<string>((resolve) => setImmediate(() => {
            captured = { value: "second" };
            resolve("two");
        }));
        return captured.value + ":" + first + ":" + second;
    };
}

const marker: any = { value: "captured" };
const pending = makeAsyncClosure(marker)("done");
marker.value = "updated";
pending.then((value) => console.log(value));
const firstSource = new Promise<string>((resolve) => setImmediate(() => resolve("one")));
makeMultiAwaitClosure({ value: "multi" })(firstSource).then((value) => console.log(value));
