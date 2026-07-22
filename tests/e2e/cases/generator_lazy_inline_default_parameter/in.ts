function* values(): Generator<number, number, number> {
    return (yield 1) + ((value: number = 7) => value + 1)() + (yield 2);
}

const iter = values();
const first: any = iter.next();
const second: any = iter.next(3);
const done: any = iter.next(4);
console.log(first.value, second.value, done.done, done.value);
