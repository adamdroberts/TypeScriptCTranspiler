let trace = "";

const thenable: any = {
    then(resolve: any): void {
        trace += "then>";
        resolve("T");
    },
};

async function run(): Promise<string> {
    trace += "start>";
    const primitive = await 3;
    trace += "p" + String(primitive) + ">";

    const nested = 1 + await 4;
    trace += "n" + String(nested) + ">";

    if (await true) trace += "if>";
    switch (await "key") {
        case "key":
            trace += "switch>";
            break;
    }

    const array = await [6, 7];
    trace += "a" + array.join("") + ">";

    const assimilated = await thenable;
    trace += assimilated + ">";
    await undefined;
    trace += "u>";
    return await "done";
}

async function throwValue(): Promise<string> {
    throw await "boom";
}

const pending = run();
trace += "after>";
pending
    .then((result) => {
        console.log("resolved:", result, trace);
        return throwValue();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("rejected:", reason),
    );
