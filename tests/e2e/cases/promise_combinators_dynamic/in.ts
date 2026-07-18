const thenable: any = {
    then: function(resolve: any): void {
        resolve("thenable");
    }
};

const nestedThenable: any = {
    then: function(resolve: any): void {
        resolve(Promise.resolve("nested"));
    }
};

const mixed: any[] = [
    Promise.resolve("promise"),
    thenable,
    "plain",
    nestedThenable,
];

Promise.all(mixed).then((values: any[]) => {
    console.log("all dynamic:", values.join(","));
    return values;
});

Promise.all(new Set<any>([
    Promise.resolve("set-promise"),
    thenable,
    "set-plain",
])).then((values: any[]) => {
    console.log("all set dynamic:", values.join(","));
    return values;
});

Promise.race([thenable, Promise.resolve("later")] as any[]).then((value: any) => {
    console.log("race dynamic:", value);
    return value;
});

Promise.any([Promise.reject("skip"), thenable] as any[]).then((value: any) => {
    console.log("any dynamic:", value);
    return value;
});

Promise.allSettled([Promise.resolve("done"), Promise.reject("bad"), "plain"] as any[]).then((items: any[]) => {
    const first: any = items[0];
    const second: any = items[1];
    const third: any = items[2];
    console.log("settled dynamic:", first.status, first.value, second.status, second.reason, third.status, third.value);
    return items;
});

Promise.allSettled(new Set<any>([Promise.resolve("set-done"), Promise.reject("set-bad"), "set-plain"])).then((items: any[]) => {
    const first: any = items[0];
    const second: any = items[1];
    const third: any = items[2];
    console.log("settled set dynamic:", first.status, first.value, second.status, second.reason, third.status, third.value);
    return items;
});

const sparse: any[] = ["a", "b", "c"];
delete sparse[1];
Promise.all(sparse).then((values: any[]) => {
    console.log("all sparse:", JSON.stringify(values));
});

Promise.allSettled(sparse).then((items: any[]) => {
    console.log("settled sparse:", JSON.stringify(items));
});

Promise.all("az").then((values: any[]) => {
    console.log("all string:", values.join("|"));
});

Promise.race("bc").then((value: any) => {
    console.log("race string:", value);
});

Promise.any("").catch((err: any) => {
    console.log("any empty string:", err.name, err.message, err.errors.length);
});

Promise.allSettled("de").then((items: any[]) => {
    const first: any = items[0];
    const second: any = items[1];
    console.log("settled string:", first.status, first.value, second.status, second.value);
});
