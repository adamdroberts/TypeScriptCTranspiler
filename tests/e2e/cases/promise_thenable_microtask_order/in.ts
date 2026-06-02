const events: string[] = [];

const thenable: any = {};
Object.defineProperty(thenable, "then", {
    get: function(): any {
        events.push("get");
        return function(resolve: any): void {
            events.push("call");
            resolve("value");
        };
    },
});

const resolved = Promise.resolve(thenable);
events.push("after resolve");

resolved.then((value: any) => {
    events.push("fulfilled:" + value);
    console.log("done:", events.join("|"));
    return value;
});

queueMicrotask(() => {
    events.push("queued");
});

console.log("sync:", events.join("|"));
