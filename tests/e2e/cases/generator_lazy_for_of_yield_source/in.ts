const events: string[] = [];

function* yieldedSource(): Generator<any, string, any> {
    for (const value of yield "source") {
        events.push("value:" + value);
        yield value;
    }
    return "done";
}

const iterator = yieldedSource();
const first: any = iterator.next();
console.log("first", first.done, first.value, events.join("|"));
const second: any = iterator.next([10, 20]);
console.log("second", second.done, second.value, events.join("|"));
const third: any = iterator.next("resume-10");
console.log("third", third.done, third.value, events.join("|"));
const fourth: any = iterator.next("resume-20");
console.log("fourth", fourth.done, fourth.value, events.join("|"));
