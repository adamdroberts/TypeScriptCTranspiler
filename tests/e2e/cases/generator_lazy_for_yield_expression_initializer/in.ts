function* yieldedExpressionInitializer(): Generator<string, string, number> {
    let count = 0;
    for (yield "initialize-a", yield "initialize-b"; count < 2; count++) {
        yield "body-" + count;
    }
    return "done";
}

const iterator = yieldedExpressionInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(10);
console.log("second", second.done, second.value);
const third: any = iterator.next(20);
console.log("third", third.done, third.value);
const fourth: any = iterator.next();
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next();
console.log("fifth", fifth.done, fifth.value);
