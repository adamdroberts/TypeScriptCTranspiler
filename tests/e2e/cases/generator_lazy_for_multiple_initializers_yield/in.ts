function* multipleInitializers(): Generator<any, string, any> {
    for (let i = yield "initialize-i", j = yield "initialize-j"; i < j; i++) {
        yield "body-" + i + ":" + j;
    }
    return "done";
}

const iterator = multipleInitializers();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next(3);
console.log("third", third.done, third.value);
const fourth: any = iterator.next("resume-body-1");
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next("resume-body-2");
console.log("fifth", fifth.done, fifth.value);
