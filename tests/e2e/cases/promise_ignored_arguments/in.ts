let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

Promise.all([Promise.resolve(1), Promise.resolve(2)], mark("a"))
    .then((values: number[]) => {
        console.log("all:", values.join(","));
        marks += "A";
        return values;
    }, undefined, mark("b"));

Promise.allSettled([Promise.resolve(3), Promise.reject<number>("bad")], mark("c"))
    .then((items: any[]) => {
        const first: any = items[0];
        const second: any = items[1];
        console.log("settled:", first.status, first.value, second.status, second.reason);
        marks += "B";
        return items;
    }, undefined, mark("d"));

Promise.race([Promise.resolve("first"), Promise.resolve("second")], mark("e"))
    .finally(() => {
        marks += "C";
    }, mark("f"))
    .then((value: string) => {
        console.log("race:", value);
        return value;
    });

Promise.any([Promise.reject<string>("skip"), Promise.resolve("kept")], mark("g"))
    .then((value: string) => {
        console.log("any:", value);
        marks += "D";
        return value;
    }, undefined, mark("h"));

Promise.try(() => {
    marks += "E";
    return 9;
}, mark("i")).then((value: number) => {
    console.log("try:", value);
    return value;
});

Promise.reject<number>("recover")
    .catch((reason: any) => {
        console.log("catch:", String(reason));
        marks += "F";
        return 7;
    }, mark("j"))
    .then((value: number) => {
        console.log("recovered:", value);
        return value;
    });

Promise.resolve("plain")
    .then(undefined, undefined, mark("k"))
    .finally(undefined, mark("l"))
    .catch(undefined, mark("m"))
    .then((value: string) => {
        console.log("plain:", value);
        return value;
    });

console.log("marks:", marks);
