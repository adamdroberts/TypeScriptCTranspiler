function* range(start: number, end: number): IterableIterator<number> {
    for (let value = start; value <= end; value++) {
        yield value;
    }
}

const gen: any = range(10, 12);
const genIter: any = gen[Symbol.iterator]();
const nextMethod: any = genIter.next;
console.log("gen method:", nextMethod.name, nextMethod.length, Object.hasOwn(nextMethod, "prototype"));
try {
    Reflect.construct(nextMethod, []);
    console.log("gen construct:", "ok");
} catch (err: any) {
    console.log("gen construct:", err);
}
console.log("gen next 1:", genIter.next().value);
console.log("gen next 2:", genIter.next().value);
console.log("gen next 3:", genIter.next().value);
console.log("gen next 4 done:", genIter.next().done);

const str: any = "xyz";
const strIter: any = str[Symbol.iterator]();
console.log("str next 1:", strIter.next().value);
console.log("str next 2:", strIter.next().value);
console.log("str next 3:", strIter.next().value);
console.log("str next 4 done:", strIter.next().done);
