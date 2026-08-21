// @ts-nocheck

const catchOrder: number[] = [];

function catchKey(marker: number, key: string): Promise<string> {
    catchOrder.push(marker);
    return Promise.resolve(key);
}

function catchFallback(marker: number, value: number): Promise<number> {
    catchOrder.push(marker);
    return Promise.resolve(value);
}

function rejectedCatchProperty(): Promise<string> {
    return Promise.reject("catch key rejected");
}

async function suspendingCatchBinding(): Promise<string> {
    try {
        await Promise.reject({ first: 10, nested: { deep: 30 } });
    } catch ({
        [await catchKey(1, "first")]: first = await catchFallback(2, 20),
        ["miss" + await catchKey(first === 10 ? 3 : 99, "ing")]: missing =
            await catchFallback(4, 40),
        nested: {
            [await catchKey(5, "deep")]: deep = await catchFallback(6, 60),
        },
    }) {
        const read = () => [first, missing, deep].join(",");
        await Promise.resolve();
        return read() + ":" + catchOrder.join(",");
    }
    return "unreachable";
}

let cleanup = "";

async function rejectedCatchKey(): Promise<string> {
    try {
        try {
            await Promise.reject({ ignored: 1 });
        } catch ({ [await rejectedCatchProperty()]: selected }) {
            return String(selected);
        }
    } finally {
        cleanup += await Promise.resolve("cleanup");
    }
    return "unreachable";
}

suspendingCatchBinding()
    .then((result) => {
        console.log("catch binding:", result);
        return rejectedCatchKey();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("catch rejection:", reason, cleanup),
    );
