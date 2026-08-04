let events = "";

const value: any = {};
value[Symbol.asyncDispose] = (): Promise<void> => {
    events += "d";
    return Promise.resolve();
};

const runArrow = async (): Promise<string> => {
    await using resource: any = value;
    events += "a";
    return events;
};

class Runner {
    async run(): Promise<string> {
        await using resource: any = value;
        events += "m";
        return events;
    }
}

runArrow().then((result: string): Promise<string> => {
    console.log("arrow result:", result);
    console.log("arrow events:", events);
    return new Runner().run();
}).then((result: string): void => {
    console.log("method result:", result);
    console.log("method events:", events);
});
