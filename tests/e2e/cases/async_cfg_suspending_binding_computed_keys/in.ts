const keyOrder: number[] = [];

function asyncKey(marker: number, key: string): Promise<string> {
    keyOrder.push(marker);
    return Promise.resolve(key);
}

function asyncFallback(marker: number, value: number): Promise<number> {
    keyOrder.push(marker);
    return Promise.resolve(value);
}

function rejectedKey(): Promise<string> {
    keyOrder.push(7);
    return Promise.reject("binding key rejected");
}

async function computedKeys(): Promise<string> {
    const source: any = { 2: 20, first: 10, nested: { deep: 30 } };
    const {
        [await Promise.resolve(2)]: numeric,
        [await asyncKey(1, "first")]: first = await asyncFallback(2, 20),
        ["miss" + await asyncKey(first === 10 ? 3 : 99, "ing")]: missing =
            await asyncFallback(4, 40),
        nested: {
            [await asyncKey(5, "deep")]: deep = await asyncFallback(6, 60),
        },
    } = source;
    return [numeric, first, missing, deep].join(",") + ":" + keyOrder.join(",");
}

async function computedKeyRejection(): Promise<boolean> {
    try {
        const { [await rejectedKey()]: selected }: any = { ignored: 1 };
        console.log(selected);
        return false;
    } catch (error) {
        return error === "binding key rejected";
    }
}

computedKeys()
    .then((result) => {
        console.log("computed keys:", result);
        return computedKeyRejection();
    })
    .then((result) => console.log("key rejection:", result));
