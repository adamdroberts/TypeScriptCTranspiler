const events: string[] = [];

const callResolve: any = {
    then: function(resolve: any, reject: any): void {
        events.push("call resolve");
        resolve.call({ ignored: true }, "call value");
        reject.call({ ignored: true }, "late");
    },
};

Promise.resolve(callResolve)
    .then((value: any) => {
        console.log("call resolve:", value);
        return value;
    });

const applyReject: any = {
    then: function(resolve: any, reject: any): void {
        events.push("apply reject");
        reject.apply({ ignored: true }, ["apply reason"]);
        resolve.apply({ ignored: true }, ["late"]);
    },
};

Promise.resolve(applyReject)
    .catch((reason: any) => {
        console.log("apply reject:", reason);
        return "handled";
    });

console.log("events:" + (events.length ? " " + events.join("|") : ""));
