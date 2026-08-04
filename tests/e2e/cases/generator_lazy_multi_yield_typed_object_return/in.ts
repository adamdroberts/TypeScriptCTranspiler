interface TypedResult {
    first: number;
    second: number;
}

function* typedObject(): Generator<number, TypedResult, number> {
    return {
        first: yield 1,
        second: 10 + (yield 2),
    };
}

const iterator = typedObject();
const first: any = iterator.next();
const second: any = iterator.next(7);
const done: any = iterator.next(8);
const result = done.value as TypedResult;

console.log(
    first.done,
    first.value,
    second.done,
    second.value,
    done.done,
    result.first,
    result.second,
);
