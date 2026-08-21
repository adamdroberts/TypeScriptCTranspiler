async function mutateShared(start: number): Promise<string> {
    let value = start;
    const read = (): number => value;
    const bump = (delta: number): number => {
        value += delta;
        return value;
    };
    const before = read();
    await Promise.resolve("pause");
    const afterBump = bump(2);
    value += 3;
    const late = (delta: number): number => {
        value += delta;
        return read();
    };
    await Promise.resolve("again");
    return `${before}:${afterBump}:${late(4)}:${read()}`;
}

async function mutateCapturedParameter(value: number): Promise<number> {
    const read = (): number => value;
    await Promise.resolve();
    value += 3;
    return read();
}

async function captureBeforeDeclaration(): Promise<number> {
    const read = (): number => late;
    await Promise.resolve();
    let late = 7;
    return read();
}

async function rebindDynamic(seed: any): Promise<string> {
    let current: any = seed;
    const read = (): string => current.label;
    await Promise.resolve();
    current = { label: "outer" };
    const replace = (): void => {
        current = { label: "inner" };
    };
    replace();
    await Promise.resolve();
    return read();
}

async function captureDestructuredBinding(): Promise<number> {
    const { value } = { value: 11 };
    const read = (): number => value;
    await Promise.resolve();
    return read();
}

async function captureIteratorBindings(): Promise<string> {
    const readers: any = [];
    for (const value of [2, 4]) {
        readers.push((): any => value);
        await Promise.resolve();
    }
    return `${readers[0]()}-${readers[1]()}`;
}

async function captureAsyncIteratorBindings(values: any): Promise<string> {
    const readers: any = [];
    for await (const value of values) {
        readers.push((): any => value);
        await Promise.resolve();
    }
    return `${readers[0]()}-${readers[1]()}`;
}

async function captureCatchBinding(): Promise<any> {
    try {
        await Promise.reject("caught");
    } catch (error) {
        const read = (): any => error;
        await Promise.resolve();
        return read();
    }
    return "uncaught";
}

class CapturedMethod {
    async run(value: number): Promise<number> {
        let local = value;
        const read = (): number => local;
        await Promise.resolve();
        local += 2;
        return read();
    }
}

mutateShared(1)
    .then((result) => {
        console.log("shared:", result);
        return mutateCapturedParameter(5);
    })
    .then((result) => {
        console.log("parameter:", result);
        return captureBeforeDeclaration();
    })
    .then((result) => {
        console.log("late declaration:", result);
        return rebindDynamic({ label: "seed" });
    })
    .then((result) => {
        console.log("dynamic:", result);
        return captureDestructuredBinding();
    })
    .then((result) => {
        console.log("destructured:", result);
        return captureIteratorBindings();
    })
    .then((result) => {
        console.log("iterator:", result);
        return captureAsyncIteratorBindings([3, 5]);
    })
    .then((result) => {
        console.log("async iterator:", result);
        return captureCatchBinding();
    })
    .then((result) => {
        console.log("catch:", result);
        return new CapturedMethod().run(6);
    })
    .then((result) => console.log("method:", result));
