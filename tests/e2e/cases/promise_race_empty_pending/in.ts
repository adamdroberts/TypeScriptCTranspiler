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

console.log("pending:", pending.toString());
console.log("callbacks:", calls.length, calls.join("|"));
