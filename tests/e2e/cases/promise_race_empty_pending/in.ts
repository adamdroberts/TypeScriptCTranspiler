const calls: string[] = [];
const empty: Promise<string>[] = [];
const pending = Promise.race(empty);

pending
    .then(
        (value: string) => {
            calls.push("then:" + value);
            return value;
        },
        (reason: any) => {
            calls.push("reject:" + String(reason));
            return String(reason);
        }
    )
    .catch((reason: any) => {
        calls.push("catch:" + String(reason));
        return String(reason);
    })
    .finally(() => {
        calls.push("finally");
    });

pending.catch((reason: any) => {
    calls.push("direct catch:" + String(reason));
    return String(reason);
});

const emptySet = new Set<Promise<string>>();
const setPending = Promise.race(emptySet);

setPending
    .then(
        (value: string) => {
            calls.push("set then:" + value);
            return value;
        },
        (reason: any) => {
            calls.push("set reject:" + String(reason));
            return String(reason);
        }
    )
    .catch((reason: any) => {
        calls.push("set catch:" + String(reason));
        return String(reason);
    })
    .finally(() => {
        calls.push("set finally");
    });

setPending.catch((reason: any) => {
    calls.push("set direct catch:" + String(reason));
    return String(reason);
});

console.log("pending:", pending.toString());
console.log("set pending:", setPending.toString());
console.log("callbacks:", calls.length, calls.join("|"));
