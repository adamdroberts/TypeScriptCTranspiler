async function calculate(): Promise<number> {
    const double = (value: number): number => value * 2;
    const before = double(3);
    const value = await Promise.resolve(4);
    const addOne = function (input: number): number {
        return input + 1;
    };
    return before + double(value) + addOne(value);
}

async function select(flag: boolean): Promise<string> {
    const left = (): string => "L";
    const right = (): string => "R";
    if (await Promise.resolve(flag)) {
        return left();
    }
    return right();
}

async function nestedAsyncClosure(): Promise<number> {
    const offset = async (value: number): Promise<number> => {
        return await Promise.resolve(value + 2);
    };
    const left = await offset(3);
    const right = await Promise.resolve(4);
    return left + right;
}

calculate()
    .then((result) => {
        console.log("calculate:", result);
        return select(true);
    })
    .then((result) => {
        console.log("left:", result);
        return select(false);
    })
    .then((result) => {
        console.log("right:", result);
        return nestedAsyncClosure();
    })
    .then((result) => console.log("nested async:", result));
