function* multiYieldComputedLiteralDeclarationInitializer(): Generator<string, string, any> {
    for (
        let record: any = {
            [(yield "key-a") + (yield "key-b")]: yield "value",
            after: yield "after",
        };
        record["prefix"] + record.after < 5;
        record["prefix"]++, record.after++
    ) {
        yield "body-" + record.prefix + ":" + record.after;
    }
    return "done";
}

const iterator = multiYieldComputedLiteralDeclarationInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next("pre");
console.log("second", second.done, second.value);
const third: any = iterator.next("fix");
console.log("third", third.done, third.value);
const fourth: any = iterator.next(2);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next(1);
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next();
console.log("sixth", sixth.done, sixth.value);
