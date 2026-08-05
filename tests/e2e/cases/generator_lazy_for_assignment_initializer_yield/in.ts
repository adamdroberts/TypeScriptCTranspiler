function* yieldedAssignmentInitializer(): Generator<any, string, any> {
    let i = 0;
    for (i = yield "initialize"; i < 2; i++) {
        yield "body-" + i;
    }
    return "done";
}

const iterator = yieldedAssignmentInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(0);
console.log("second", second.done, second.value);
const third: any = iterator.next("resume-body-0");
console.log("third", third.done, third.value);
const fourth: any = iterator.next("resume-body-1");
console.log("fourth", fourth.done, fourth.value);
