function total(first: number, ...rest: number[]): number {
    console.log("callback", first, rest.length);
    let result = first;
    for (const value of rest) result += value;
    return result;
}
const input: number[] = [5, 7];
Promise.try(total, 3, ...input).then(value => { console.log("value", value); });
const token = Symbol("payload");
Promise.try(() => { throw token; }).catch((error: any) => { console.log("throw", error === token); });
const tryMethod: any = Promise.try;
tryMethod.call(Promise, (a: any, b: any) => a + b, 11, 13)
    .then((value: any) => { console.log("alias", value); });
console.log("after");
