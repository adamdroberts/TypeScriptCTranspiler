let events = "";

const value: any = {};
value[Symbol.asyncDispose] = (): Promise<void> => {
    events += "d";
    return Promise.resolve();
};

async function run(): Promise<string> {
    await using resource: any = value;
    events += "b";
    return events;
}

async function runNormal(): Promise<void> {
    await using resource: any = value;
    events += "n";
}

run()
    .then((result: string): Promise<void> => {
        console.log("result:", result);
        console.log("events:", events);
        return runNormal();
    })
    .then((_ignored: any): void => {
        console.log("normal events:", events);
    });

async function runFailure(): Promise<string> {
    await using resource: any = ({} as any);
    return "body";
}

runFailure().then(
    (result: string): void => console.log("unexpected:", result),
    (reason: any): void => console.log("dispose error:", reason),
);
