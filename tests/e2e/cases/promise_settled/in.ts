const events: string[] = [];
let ignored = "";
function mark(label: string): string {
    ignored += label;
    return label;
}

const doubled = Promise.resolve(2, mark("a"))
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

Promise.reject<number>("boom", mark("b"))
    .catch((reason: any) => {
        events.push("catch:" + String(reason));
        return 7;
    })
    .then((n: number) => {
        console.log("recovered:", n);
        return n;
    });

Promise.reject<string>("bad", mark("c"))
    .then(
        (value: string) => value,
        (reason: any) => String(reason) + "!"
    )
    .then((value: string) => {
        console.log("then reject:", value);
        return value;
    });

Promise.all([Promise.resolve(3, mark("d")), Promise.resolve(4, mark("e"))])
    .then((values: number[]) => {
        console.log("all:", values.join(","));
        return values;
    });

Promise.race([Promise.resolve("first", mark("f")), Promise.resolve("second", mark("g"))])
    .then((value: string) => {
        console.log("race:", value);
        return value;
    });

Promise.any([Promise.reject<string>("skip", mark("h")), Promise.resolve("kept", mark("i"))])
    .then((value: string) => {
        console.log("any:", value);
        return value;
    });

Promise.allSettled([Promise.resolve(9, mark("j")), Promise.reject<number>("nope", mark("k"))])
    .then((items: any[]) => {
        const first: any = items[0];
        const second: any = items[1];
        console.log("settled:", first.status, first.value, second.status, second.reason);
        return items;
    });

console.log("events:", events.join("|"));
console.log("ignored:", ignored);
