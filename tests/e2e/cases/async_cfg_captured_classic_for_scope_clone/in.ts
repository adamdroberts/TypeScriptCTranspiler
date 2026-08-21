async function preservesIterationCells(limit: number): Promise<boolean> {
    const readers: any = [];
    for (let index = 0; index < limit; index++) {
        readers.push((): number => index);
        await Promise.resolve();
    }
    for (let index = 0; index < readers.length; index++) {
        if (readers[index]() !== index) return false;
    }
    return readers.length === limit;
}

async function preservesContinueCells(limit: number): Promise<boolean> {
    const readers: any = [];
    for (let index = 0; index < limit; index++) {
        readers.push((): number => index);
        await Promise.resolve();
        continue;
    }
    for (let index = 0; index < readers.length; index++) {
        if (readers[index]() !== index) return false;
    }
    return readers.length === limit;
}

async function preservesDynamicRoots(limit: number): Promise<boolean> {
    const readers: any = [];
    for (
        let index = 0, dynamic: any = { value: 0 };
        index < limit;
        index++, dynamic = { value: index }
    ) {
        readers.push((): any => dynamic.value);
        await Promise.resolve();
    }
    for (let index = 0; index < readers.length; index++) {
        if (readers[index]() !== index) return false;
    }
    return readers.length === limit;
}

async function separatesInitializerEnvironment(): Promise<boolean> {
    let initializerReader: any;
    let bodyReader: any;
    for (let index = 0, readInitializer = (): number => index; index < 1; index++) {
        index = 5;
        initializerReader = readInitializer;
        bodyReader = (): number => index;
        await Promise.resolve();
    }
    return initializerReader() === 0 && bodyReader() === 5;
}

preservesIterationCells(64)
    .then((iterationCells) => {
        console.log("iteration cells:", iterationCells);
        return preservesContinueCells(64);
    })
    .then((continueCells) => {
        console.log("continue cells:", continueCells);
        return preservesDynamicRoots(64);
    })
    .then((dynamicRoots) => {
        console.log("dynamic roots:", dynamicRoots);
        return separatesInitializerEnvironment();
    })
    .then((initializerEnvironment) => console.log("initializer environment:", initializerEnvironment));
