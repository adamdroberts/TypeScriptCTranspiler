const events: string[] = [];

const doubled = Promise.resolve(2)
    .then((n: number) => {
        events.push("then:" + n);
        return n + 3;
    })
    .finally(() => {
        events.push("finally");
    })
    .then((n: number) => n * 2);

doubled.then((n: number) => {
    console.log("fulfilled:", n);
    return n;
});

Promise.reject<number>("boom")
    .catch((reason: any) => {
        events.push("catch:" + String(reason));
        return 7;
    })
    .then((n: number) => {
        console.log("recovered:", n);
        return n;
    });

Promise.reject<string>("bad")
    .then(
        (value: string) => value,
        (reason: any) => String(reason) + "!"
    )
    .then((value: string) => {
        console.log("then reject:", value);
        return value;
    });

Promise.all([Promise.resolve(3), Promise.resolve(4)])
    .then((values: number[]) => {
        console.log("all:", values.join(","));
        return values;
    });

Promise.race([Promise.resolve("first"), Promise.resolve("second")])
    .then((value: string) => {
        console.log("race:", value);
        return value;
    });

Promise.any([Promise.reject<string>("skip"), Promise.resolve("kept")])
    .then((value: string) => {
        console.log("any:", value);
        return value;
    });

Promise.allSettled([Promise.resolve(9), Promise.reject<number>("nope")])
    .then((items: any[]) => {
        const first: any = items[0];
        const second: any = items[1];
        console.log("settled:", first.status, first.value, second.status, second.reason);
        return items;
    });

console.log("events:", events.join("|"));
