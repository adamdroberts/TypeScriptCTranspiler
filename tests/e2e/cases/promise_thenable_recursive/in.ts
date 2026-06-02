const events: string[] = [];

const inner: any = {
    then: function(resolve: any, reject: any): void {
        events.push("inner");
        resolve("final");
        reject("late-inner");
    },
};

const outer: any = {
    then: function(resolve: any, reject: any): void {
        events.push("outer");
        resolve(inner);
        reject("late-outer");
    },
};

Promise.resolve(outer)
    .then((value: any) => {
        console.log("nested:", value);
        return value;
    });

const rejectingInner: any = {
    then: function(resolve: any, reject: any): void {
        events.push("rejecting-inner");
        reject("inner-bad");
        resolve("late-inner");
    },
};

const rejectingOuter: any = {
    then: function(resolve: any, reject: any): void {
        events.push("rejecting-outer");
        resolve(rejectingInner);
        reject("late-outer");
    },
};

Promise.resolve(rejectingOuter)
    .catch((reason: any) => {
        console.log("nested reject:", reason);
        return "handled";
    });

const pendingInner: any = {
    then: function(resolve: any, reject: any): void {
        events.push("pending-inner");
    },
};

const pendingOuter: any = {
    then: function(resolve: any, reject: any): void {
        events.push("pending-outer");
        resolve(pendingInner);
        reject("late-outer");
    },
};

let pendingCallbacks = 0;
Promise.resolve(pendingOuter)
    .then((value: any) => {
        pendingCallbacks++;
        return value;
    })
    .catch((reason: any) => {
        pendingCallbacks++;
        return reason;
    });

console.log("pending callbacks:", pendingCallbacks);
console.log("events:" + (events.length ? " " + events.join("|") : ""));
