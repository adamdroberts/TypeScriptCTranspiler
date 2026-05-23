const events: string[] = [];

const self: any = {};
self.then = function(resolve: any, reject: any): void {
    events.push("self");
    resolve(self);
    reject("late");
};

Promise.resolve(self)
    .catch((reason: any) => {
        console.log("self:", reason);
        return "handled";
    });

const outer: any = {};
outer.then = function(resolve: any): void {
    events.push("outer");
    resolve(outer);
};

Promise.resolve(outer)
    .then((value: any) => {
        console.log("outer fulfilled:", value);
        return value;
    })
    .catch((reason: any) => {
        console.log("outer:", reason);
        return "handled";
    });

const first: any = {};
const second: any = {};
first.then = function(resolve: any): void {
    events.push("first");
    resolve(second);
};
second.then = function(resolve: any): void {
    events.push("second");
    resolve(first);
};

Promise.resolve(first)
    .catch((reason: any) => {
        console.log("cycle:", reason);
        return "handled";
    });

console.log("events:", events.join("|"));
