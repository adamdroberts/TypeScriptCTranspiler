const failures = [
    Promise.reject<string>("first"),
    Promise.reject<string>("second"),
];

Promise.any(failures)
    .catch((reason: any) => {
        console.log("any rejected:", reason.name, reason.message);
        console.log("errors:", reason.errors.length, reason.errors.join("|"));
        return "fallback";
    })
    .then((value: string) => {
        console.log("recovered:", value);
        return value;
    });

const empty: Promise<string>[] = [];
Promise.any(empty)
    .catch((reason: any) => {
        console.log("empty rejected:", reason.name, reason.errors.length);
        return "empty";
    })
    .then((value: string) => {
        console.log("empty recovered:", value);
        return value;
    });

const setFailures = new Set([
    Promise.reject<string>("set-first"),
    Promise.reject<string>("set-second"),
]);

Promise.any(setFailures)
    .catch((reason: any) => {
        console.log("set rejected:", reason.name, reason.message);
        console.log("set errors:", reason.errors.length, reason.errors.join("|"));
        return "set fallback";
    })
    .then((value: string) => {
        console.log("set recovered:", value);
        return value;
    });

const emptySet = new Set<Promise<string>>();
Promise.any(emptySet)
    .catch((reason: any) => {
        console.log("empty set rejected:", reason.name, reason.errors.length);
        return "empty set";
    })
    .then((value: string) => {
        console.log("empty set recovered:", value);
        return value;
    });
