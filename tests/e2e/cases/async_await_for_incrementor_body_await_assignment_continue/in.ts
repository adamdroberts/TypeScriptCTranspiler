let events = 0;
let last = 0;

function laterBoolean(value: boolean): Promise<boolean> {
    events = events * 10 + 1;
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterBody(value: number): Promise<number> {
    events = events * 10 + 3;
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterIncrementor(value: number): Promise<number> {
    events = events * 10 + 5;
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function run(): Promise<string> {
    let index = 0;
    for (; await laterBoolean(index < 2); await laterIncrementor(index++)) {
        let first: number;
        first = await laterBody(index + 1);
        events = events * 10 + 4;
        await laterBody(first + 10);
        events = events * 10 + 6;
        last = first;
        continue;
    }
    return await laterString(events + "|" + last + "|" + index);
}

run().then((value) => console.log(value));
