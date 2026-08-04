let events = "";

const value: any = {};
value[Symbol.asyncDispose] = (): Promise<void> => {
    events += "d";
    return Promise.resolve();
};

async function run(flag: boolean, nested: boolean): Promise<string> {
    await using resource: any = value;
    if (flag) {
        events += "t";
        const answer = "yes";
        if (nested) {
            events += "n";
            return answer;
        } else {
            events += "a";
            return "alternate";
        }
    } else {
        events += "f";
        const answer = "no";
        return answer;
    }
}

async function throwBranch(): Promise<string> {
    await using resource: any = value;
    if (true) {
        events += "x";
        if (false) {
            return "never";
        } else {
            const reason = "boom";
            throw reason;
        }
    }
    return "never";
}

run(true, true)
    .then((result: string): Promise<string> => {
        console.log("true:", result, events);
        return run(false, false);
    })
    .then((result: string): Promise<string> => {
        console.log("false:", result, events);
        return throwBranch();
    })
    .then(
        (result: string): void => console.log("unexpected:", result),
        (reason: any): void => console.log("throw:", reason, events),
    );
