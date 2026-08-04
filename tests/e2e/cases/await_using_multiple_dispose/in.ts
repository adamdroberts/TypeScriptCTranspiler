let events = "";

const first: any = {};
first[Symbol.asyncDispose] = (): Promise<void> => {
    events += "1";
    return Promise.resolve();
};

const failing: any = {};
failing[Symbol.asyncDispose] = (): Promise<void> => {
    events += "2";
    return Promise.reject("dispose-failure");
};

const last: any = {};
last[Symbol.asyncDispose] = (): Promise<void> => {
    events += "3";
    return Promise.resolve();
};

async function run(): Promise<string> {
    await using firstResource: any = first, failingResource: any = failing;
    await using lastResource: any = last;
    events += "b";
    return "body";
}

run().then(
    (result: string): void => console.log("unexpected:", result),
    (reason: any): void => {
        console.log("reason:", reason);
        console.log("events:", events);
    },
);
