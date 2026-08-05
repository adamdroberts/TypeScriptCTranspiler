function* multiYieldLiteralDeclarationInitializer(): Generator<string, string, number> {
    for (
        let values = [(yield "array-a"), (yield "array-b")],
        record = { first: (yield "object-a"), second: (yield "object-b") };
        values[0] + values[1] + record.first + record.second < 10;
        values[0]++, values[1]++, record.first++, record.second++
    ) {
        yield "body-" + (values[0] + values[1] + record.first + record.second);
    }
    return "done";
}

const iterator = multiYieldLiteralDeclarationInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next(2);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(1);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next(2);
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next();
console.log("sixth", sixth.done, sixth.value);
