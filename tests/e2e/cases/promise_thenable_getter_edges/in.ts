const events: string[] = [];

const throwingGetter: any = {};
Object.defineProperty(throwingGetter, "then", {
    get: function(): any {
        events.push("throw getter");
        throw "getter boom";
    },
});

Promise.resolve(throwingGetter)
    .catch((reason: any) => {
        console.log("throw getter:", reason);
        return "handled";
    });

const nonCallableGetter: any = { value: 7 };
Object.defineProperty(nonCallableGetter, "then", {
    get: function(): any {
        events.push("noncall getter");
        return 3;
    },
});

Promise.resolve(nonCallableGetter)
    .then((value: any) => {
        console.log("noncall getter:", value.value);
        return value;
    });

console.log("events:", events.join("|"));
