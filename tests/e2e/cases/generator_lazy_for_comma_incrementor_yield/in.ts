function* commaIncrementor(): Generator<any, string, any> {
    let count = 0;
    let i = 0;
    let j = 0;
    for (; count < 2; count++, i = yield "increment-i", j = yield "increment-j") {
        yield "body-" + count;
    }
    return "done";
}

const iterator = commaIncrementor();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next("resume-body-0");
console.log("second", second.done, second.value);
const third: any = iterator.next(1);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(2);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next("resume-body-1");
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next(3);
console.log("sixth", sixth.done, sixth.value);
const seventh: any = iterator.next(4);
console.log("seventh", seventh.done, seventh.value);
