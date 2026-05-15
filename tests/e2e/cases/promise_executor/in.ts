const events: string[] = [];

const made = new Promise<string>((resolve) => {
    events.push("made executor");
    resolve("made");
});

made
    .then((value: string) => value + "!")
    .then((value: string) => {
        console.log("fulfilled:", value);
        return value;
    });

const rejected = new Promise<number>((resolve, reject) => {
    events.push("reject executor");
    reject("bad");
    resolve(2);
});

rejected
    .catch((reason: string) => {
        console.log("rejected:", reason);
        return 7;
    })
    .then((value: number) => {
        console.log("recovered:", value);
        return value;
    });

const thrown = new Promise<string>(() => {
    events.push("throw executor");
    throw "explode";
});

thrown
    .catch((reason: string) => {
        console.log("thrown:", reason);
        return "caught";
    })
    .then((value: string) => {
        console.log("thrown recovered:", value);
        return value;
    });

const resolvedThenThrown = new Promise<string>((resolve) => {
    events.push("resolve throw executor");
    resolve("kept");
    throw "ignored";
});

resolvedThenThrown.then((value: string) => {
    console.log("resolve before throw:", value);
    return value;
});

let callbacks = 0;
const idle = new Promise<string>(() => {
    events.push("idle executor");
});

idle
    .then((value: string) => {
        callbacks++;
        return value;
    })
    .catch((reason: string) => {
        callbacks++;
        return reason;
    })
    .finally(() => {
        callbacks++;
    });

console.log("idle:", idle.toString());
console.log("callbacks:", callbacks);
console.log("events:", events.join("|"));
