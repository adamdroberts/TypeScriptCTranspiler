const events: string[] = [];

const throwingGetter: any = {};
Object.defineProperty(throwingGetter, "then", {
    get: function(): any {
        events.push("try throw getter");
        throw "try getter boom";
    },
});

Promise.try(() => throwingGetter)
    .catch((reason: any) => {
        console.log("try throw getter:", reason);
        return "handled";
    });

const nonCallableGetter: any = { value: 9 };
Object.defineProperty(nonCallableGetter, "then", {
    get: function(): any {
        events.push("try noncall getter");
        return 4;
    },
});

Promise.try(() => nonCallableGetter)
    .then((value: any) => {
        console.log("try noncall getter:", value.value);
        return value;
    });

console.log("events:", events.join("|"));
