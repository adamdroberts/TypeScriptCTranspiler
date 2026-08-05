function* multiYieldDeclarationInitializer(): Generator<string, string, number> {
    for (
        let i = (yield "i-a") + (yield "i-b"),
        j = (yield "j-a") + (yield "j-b");
        i + j < 5;
        i++, j++
    ) {
        yield "body-" + i + ":" + j;
    }
    return "done";
}

const iterator = multiYieldDeclarationInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next(1);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(1);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next(1);
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next();
console.log("sixth", sixth.done, sixth.value);
