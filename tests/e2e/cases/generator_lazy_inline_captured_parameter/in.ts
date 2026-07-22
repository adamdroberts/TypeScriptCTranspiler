function makeGenerator(): () => Generator<number, number, number> {
    let offset = 5;
    offset = 6;
    return function* (): Generator<number, number, number> {
        return (yield 1) + ((value: number) => value + offset)(7) + (yield 2);
    };
}

const iter = makeGenerator()();
const first: any = iter.next();
const second: any = iter.next(3);
const done: any = iter.next(4);
console.log(first.value, second.value, done.done, done.value);
