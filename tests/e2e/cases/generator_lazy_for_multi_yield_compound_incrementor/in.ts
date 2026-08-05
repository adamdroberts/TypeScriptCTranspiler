function* multiYieldCompoundIncrementor(): Generator<string, string, number> {
    let i = 0;
    for (; i < 4; i += (yield "increment-a") + (yield "increment-b")) {
        yield "body-" + i;
    }
    return "done";
}

const iterator = multiYieldCompoundIncrementor();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next();
console.log("second", second.done, second.value);
const third: any = iterator.next(1);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(1);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next();
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next(1);
console.log("sixth", sixth.done, sixth.value);
const seventh: any = iterator.next(1);
console.log("seventh", seventh.done, seventh.value);
