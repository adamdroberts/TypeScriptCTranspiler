const callbacks: string[] = [];
const empty: Promise<string>[] = [];
const pending = Promise.race(empty);

Promise.all([Promise.resolve("ready"), pending])
    .then((values: string[]) => {
        callbacks.push("all:" + values.join(","));
        return values;
    })
    .catch((reason: any) => {
        callbacks.push("all catch:" + String(reason));
        return [String(reason)];
    })
    .finally(() => {
        callbacks.push("all finally");
    });

Promise.allSettled([Promise.resolve("done"), pending])
    .then((items: any[]) => {
        callbacks.push("settled:" + items.length);
        return items;
    })
    .finally(() => {
        callbacks.push("settled finally");
    });

Promise.any([Promise.reject<string>("skip"), pending])
    .then((value: string) => {
        callbacks.push("any:" + value);
        return value;
    })
    .catch((reason: any) => {
        callbacks.push("any catch:" + String(reason));
        return String(reason);
    });

Promise.race([pending])
    .then((value: string) => {
        callbacks.push("race pending:" + value);
        return value;
    })
    .catch((reason: any) => {
        callbacks.push("race pending catch:" + String(reason));
        return String(reason);
    });

Promise.race([pending, Promise.resolve("later")])
    .then((value: string) => {
        console.log("race later:", value);
        return value;
    });

Promise.race([pending, Promise.reject<string>("bad")])
    .catch((reason: any) => {
        console.log("race reject:", String(reason));
        return "handled";
    })
    .then((value: string) => {
        console.log("race recovered:", value);
        return value;
    });

console.log("pending callbacks:", callbacks.length, callbacks.join("|"));
