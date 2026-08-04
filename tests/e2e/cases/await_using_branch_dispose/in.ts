let events = "";

const value: any = {};
value[Symbol.asyncDispose] = (): Promise<void> => {
    events += "d";
    return Promise.resolve();
};

async function run(flag: boolean): Promise<string> {
    await using resource: any = value;
    if (flag) return "yes";
    return "no";
}

async function throwBranch(): Promise<string> {
    await using resource: any = value;
    if (true) throw "boom";
    return "never";
}

run(true)
    .then((result: string): Promise<string> => {
        console.log("true:", result, events);
        return run(false);
    })
    .then((result: string): Promise<string> => {
        console.log("false:", result, events);
        return throwBranch();
    })
    .then(
        (result: string): void => console.log("unexpected:", result),
        (reason: any): void => console.log("throw:", reason, events),
    );
