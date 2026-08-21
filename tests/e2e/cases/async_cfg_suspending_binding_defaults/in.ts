const fallbackOrder: number[] = [];

function numberFallback(marker: number, value: number): Promise<number> {
    fallbackOrder.push(marker);
    return Promise.resolve(value);
}

function objectFallback(marker: number, value: number): Promise<any> {
    fallbackOrder.push(marker);
    return Promise.resolve({ deep: value });
}

function arrayFallback(marker: number, value: number): Promise<any> {
    fallbackOrder.push(marker);
    return Promise.resolve([value]);
}

function rejectedNumber(): Promise<number> {
    return Promise.reject("binding default rejected");
}

function computedKey(marker: number, key: string): string {
    fallbackOrder.push(marker);
    return key;
}

async function bindingDefaults(): Promise<string> {
    const key = "named";
    const source: any = { present: 10, nested: undefined, named: 12 };
    const {
        present = await numberFallback(1, 11),
        missing = 10 + await numberFallback(2, 10),
        nested: { deep = await numberFallback(3, 30) } = await objectFallback(4, 40),
        [key]: computed = await numberFallback(5, 50),
    } = source;
    const [
        first = await numberFallback(6, 60),
        second = await numberFallback(7, 70),
        [arrayDeep = await numberFallback(8, 80)] = await arrayFallback(9, 90),
    ]: any = [undefined, 7, undefined];
    const {
        earlier = await numberFallback(10, 100),
        later = await Promise.resolve(earlier + 1),
    }: any = {};
    const {
        [computedKey(11, "named")]: orderedComputed = await numberFallback(12, 120),
    } = source;

    const values = [
        present, missing, deep, computed, first, second, arrayDeep,
        earlier, later, orderedComputed,
    ];
    return values.join(",") + ":" + fallbackOrder.join(",");
}

async function bindingDefaultRejection(): Promise<boolean> {
    try {
        const { missing = await rejectedNumber() }: any = {};
        console.log(missing);
        return false;
    } catch (error) {
        return error === "binding default rejected";
    }
}

bindingDefaults()
    .then((result) => {
        console.log("defaults:", result);
        return bindingDefaultRejection();
    })
    .then((result) => console.log("rejection:", result));
