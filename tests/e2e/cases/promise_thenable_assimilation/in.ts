const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

const fulfilled: any = {
    then: function(resolve: any, reject: any): void {
        events.push("fulfilled then:" + typeof resolve + ":" + typeof reject);
        resolve("ready");
        reject("late");
    },
};

Promise.resolve(fulfilled, mark("f"))
    .then((value: any) => {
        console.log("fulfilled:", value);
        return value;
    });

const rejected: any = {
    then: function(resolve: any, reject: any): void {
        events.push("rejected then");
        reject("bad");
        resolve("late");
    },
};

Promise.resolve(rejected)
    .catch((reason: any) => {
        console.log("rejected:", reason);
        return "handled";
    })
    .then((value: any) => {
        console.log("recovered:", value);
        return value;
    });

const plain: any = { then: "not callable", value: 7 };
Promise.resolve(plain)
    .then((value: any) => {
        console.log("plain:", value.value);
        return value;
    });

const throwing: any = {
    then: function(resolve: any): void {
        events.push("throwing then");
        throw "boom";
    },
};

Promise.resolve(throwing)
    .catch((reason: any) => {
        console.log("throwing:", reason);
        return "caught";
    });

Promise.resolve("start")
    .then((value: string) => ({
        then: function(resolve: any): void {
            events.push("callback then:" + value);
            resolve(value + ":next");
        },
    } as any))
    .then((value: any) => {
        console.log("callback:", value);
        return value;
    });

console.log("events:", events.join("|"));
