let events = 0;

function laterBoolean(value: boolean): Promise<boolean> {
    events = events * 10 + 1;
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    events = events * 10 + 3;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterNumber(value: number): Promise<number> {
    events = events * 10 + 5;
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

async function run(): Promise<string> {
    let index = 0;
    for (; await laterBoolean(index < 2); await laterNumber(index++)) {
        events = events * 10 + 2;
        await laterString("body");
        events = events * 10 + 4;
        await laterString("body-again");
        events = events * 10 + 6;
        continue;
    }
    return await laterString(events + "|" + index);
}

run().then((value) => console.log(value));
