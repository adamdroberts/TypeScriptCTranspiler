// @ts-nocheck

const restOrder: number[] = [];

function restKey(marker: number, key: string): Promise<string> {
    restOrder.push(marker);
    return Promise.resolve(key);
}

function restFallback(marker: number, value: number): Promise<number> {
    restOrder.push(marker);
    return Promise.resolve(value);
}

async function declarationRest(): Promise<string> {
    const source: any = {
        keep: 10,
        nested: [1, 2, 3],
        other: 20,
    };
    const {
        [await restKey(1, "keep")]: keep = await restFallback(2, -1),
        missing = await restFallback(3, 30),
        nested: [head, ...tail],
        ...rest
    } = source;
    return [keep, missing, head, tail.join(","), rest.other].join(":") +
        ":" + String(rest.keep) + ":" + String(rest.nested);
}

async function catchRest(): Promise<string> {
    try {
        await Promise.reject({ code: "E", extra: 40 });
    } catch ({ code = await restFallback(4, 4), ...rest }) {
        return code + ":" + rest.extra;
    }
    return "unreachable";
}

async function iteratorRest(): Promise<string> {
    let selected: any;
    let remaining: any;
    for ({
        [await restKey(5, "chosen")]: selected,
        ...remaining
    } of [{ chosen: 50, extra: 60 }]) {
        await Promise.resolve();
    }

    let head: any;
    let tail: any;
    for ([head = await restFallback(6, 70), ...tail] of [[undefined, 80, 90]]) {
        await Promise.resolve();
    }
    return [selected, remaining.extra, head, tail.join(",")].join(":");
}

declarationRest()
    .then((result) => {
        console.log("declaration rest:", result, restOrder.join(","));
        return catchRest();
    })
    .then((result) => {
        console.log("catch rest:", result, restOrder.join(","));
        return iteratorRest();
    })
    .then((result) => console.log("iterator rest:", result, restOrder.join(",")));
