function makeChoices(limit: number): number[] {
    const choices: number[] = [];
    for (let index = 0; index < limit; index++) choices.push(index % 3);
    return choices;
}

async function preservesSwitchCells(choices: number[]): Promise<boolean> {
    const readers: any = [];
    const expected: number[] = [];
    for (const choice of choices) {
        switch (await Promise.resolve(choice)) {
            case 0:
                const first = choice + 10;
                readers.push((): number => first);
                expected.push(choice + 10);
                await Promise.resolve();
            case 1:
                const second = choice + 20;
                readers.push((): number => second);
                expected.push(choice + 20);
                await Promise.resolve();
                break;
            default:
                const fallback: any = { value: choice + 30 };
                readers.push((): any => fallback.value);
                expected.push(choice + 30);
                await Promise.resolve();
        }
    }

    if (readers.length !== expected.length) return false;
    for (let index = 0; index < readers.length; index++) {
        if (readers[index]() !== expected[index]) return false;
    }
    return true;
}

async function preservesAwaitedCaseCells(choices: number[]): Promise<boolean> {
    const readers: any = [];
    const expected: number[] = [];
    for (const choice of choices) {
        switch (choice) {
            case await Promise.resolve(0):
                const matched = choice + 40;
                readers.push((): number => matched);
                expected.push(choice + 40);
                await Promise.resolve();
                break;
            default:
                const unmatched = choice + 50;
                readers.push((): number => unmatched);
                expected.push(choice + 50);
                await Promise.resolve();
        }
    }

    if (readers.length !== expected.length) return false;
    for (let index = 0; index < readers.length; index++) {
        if (readers[index]() !== expected[index]) return false;
    }
    return true;
}

preservesSwitchCells(makeChoices(48))
    .then((result) => {
        console.log("switch cells:", result);
        return preservesAwaitedCaseCells(makeChoices(48));
    })
    .then((result) => console.log("awaited case cells:", result));
