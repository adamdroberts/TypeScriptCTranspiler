function* commaInitializer(): Generator<any, string, any> {
    let count = 0;
    let i = 0;
    let j = 0;
    for (i = yield "initialize-i", j = yield "initialize-j"; count < 2; count++) {
        yield "body-" + count + ":" + i + ":" + j;
    }
    return "done";
}

const iterator = commaInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next(2);
console.log("third", third.done, third.value);
const fourth: any = iterator.next("resume-body-0");
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next("resume-body-1");
console.log("fifth", fifth.done, fifth.value);
