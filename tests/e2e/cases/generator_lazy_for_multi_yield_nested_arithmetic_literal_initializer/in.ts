function* multiYieldNestedArithmeticLiteralInitializer(): Generator<string, string, number> {
    for (
        let values = [(yield "array-a") + 1, (yield "array-b") * 2],
        record = { total: (yield "object-a") + (yield "object-b") };
        values[0] + values[1] + record.total < 15;
        values[0]++, values[1]++, record.total++
    ) {
        yield "body-" + (values[0] + values[1] + record.total);
    }
    return "done";
}

const iterator = multiYieldNestedArithmeticLiteralInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next(2);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(3);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next(4);
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next();
console.log("sixth", sixth.done, sixth.value);
