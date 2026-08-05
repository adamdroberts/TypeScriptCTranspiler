function* yieldedIncrementor(): Generator<string, string, any> {
    let i = 0;
    for (; i < 2; yield "increment-" + i) {
        yield "body-" + i;
        i++;
    }
    return "done";
}

const iterator = yieldedIncrementor();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next("resume-body-0");
console.log("second", second.done, second.value);
const third: any = iterator.next("resume-increment-0");
console.log("third", third.done, third.value);
const fourth: any = iterator.next("resume-body-1");
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next("resume-increment-1");
console.log("fifth", fifth.done, fifth.value);
