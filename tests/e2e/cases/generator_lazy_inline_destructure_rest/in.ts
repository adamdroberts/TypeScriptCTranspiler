function* arrayValues(): Generator<number, number, number> {
    return (yield 1) + (([first, ...rest]: number[]) => first + rest[0] + rest[1])([7, 8, 9]) + (yield 2);
}

function* objectValues(): Generator<number, number, number> {
    return (yield 1) + (({ first, ...rest }: { first: number; second: number; third: number }) => first + rest.second + rest.third)({ first: 7, second: 8, third: 9 }) + (yield 2);
}

function run(iter: Generator<number, number, number>): void {
    const first: any = iter.next();
    const second: any = iter.next(3);
    const done: any = iter.next(4);
    console.log(first.value, second.value, done.done, done.value);
}

run(arrayValues());
run(objectValues());

function makeCapturedValues(): () => Generator<number, number, number> {
    let offset = 5;
    offset = 6;
    return function* (): Generator<number, number, number> {
        return (yield 1) +
            (([first, ...rest]: number[]) => first + rest[0] + rest[1])([7, 8, 9]) +
            (({ first, ...rest }: { first: number; second: number; third: number }) => first + rest.second + rest.third)({ first: 7, second: 8, third: 9 }) +
            offset +
            (yield 2);
    };
}

run(makeCapturedValues()());
