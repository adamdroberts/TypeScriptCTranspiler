function* multiYieldSpreadLiteralDeclarationInitializer(): Generator<string, string, any> {
    for (
        let values: any = [(yield "array-first"), ...(yield "array-spread")],
        record: any = {
            first: yield "object-first",
            ...(yield "object-spread"),
        };
        record.first + record.second < 11;
        record.first++
    ) {
        yield "body-" + values.length + ":" + record.first + ":" + record.second;
    }
    return "done";
}

const iterator = multiYieldSpreadLiteralDeclarationInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next([2, 3]);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(4);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next({ second: 5 });
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next();
console.log("sixth", sixth.done, sixth.value);
const seventh: any = iterator.next();
console.log("seventh", seventh.done, seventh.value);
