const events: string[] = [];

const callbackResolveThenThrow: any = {
    then: function(resolve: any, reject: any): void {
        events.push("callback resolve then throw");
        resolve("callback kept");
        throw "callback late throw";
    },
};

Promise.resolve("start")
    .then((_value: string) => callbackResolveThenThrow)
    .then((value: any) => {
        console.log("callback resolve kept:", value);
        return value;
    })
    .catch((reason: any) => {
        console.log("callback resolve rejected:", reason);
        return "bad";
    });

const tryRejectThenThrow: any = {
    then: function(resolve: any, reject: any): void {
        events.push("try reject then throw");
        reject("try kept reason");
        throw "try late throw";
    },
};

Promise.try(() => tryRejectThenThrow)
    .then((value: any) => {
        console.log("try reject fulfilled:", value);
        return value;
    })
    .catch((reason: any) => {
        console.log("try reject kept:", reason);
        return "handled";
    });

console.log("events:" + (events.length ? " " + events.join("|") : ""));
