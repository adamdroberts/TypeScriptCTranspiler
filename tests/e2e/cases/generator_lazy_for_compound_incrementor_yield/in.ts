function* yieldedCompoundIncrementor(): Generator<any, string, any> {
    let i = 0;
    for (; i < 2; i += yield "increment") {
        yield "body-" + i;
    }
    return "done";
}

const iterator = yieldedCompoundIncrementor();
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
