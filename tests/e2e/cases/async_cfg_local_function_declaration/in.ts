async function run(): Promise<number> {
    await Promise.resolve(1);

    function nested(value: number): number {
        return value + 2;
    }

    async function nestedAsync(value: number): Promise<number> {
        return await Promise.resolve(value + 3);
    }

    const syncValue = nested(4);
    const asyncValue = await nestedAsync(5);
    return syncValue + asyncValue;
}

async function other(): Promise<number> {
    await Promise.resolve(0);

    function nested(value: number): number {
        return value + 3;
    }

    return nested(4);
}

run().then((value) => other().then((otherValue) => console.log(value + otherValue)));
