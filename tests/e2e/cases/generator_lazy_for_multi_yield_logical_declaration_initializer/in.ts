function* multiYieldLogicalDeclarationInitializer(): Generator<string, string, number> {
    for (
        let i: any = (yield "i-a") && (yield "i-b"),
        j: any = (yield "j-a") || (yield "j-b"),
        k: any = (yield "k-a") ?? (yield "k-b");
        i + j + k < 6;
        i++, j++, k++
    ) {
        yield "body-" + i + ":" + j + ":" + k;
    }
    return "done";
}

const iterator = multiYieldLogicalDeclarationInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next(2);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(0);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next(3);
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next(0);
console.log("sixth", sixth.done, sixth.value);
const seventh: any = iterator.next();
console.log("seventh", seventh.done, seventh.value);
