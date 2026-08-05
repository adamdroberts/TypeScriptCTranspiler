const events: string[] = [];

function* yieldedSource(): Generator<any, string, any> {
    for (const key in yield "source") {
        events.push("key:" + key);
        yield key;
    }
    return "done";
}

const iterator = yieldedSource();
const first: any = iterator.next();
console.log("first", first.done, first.value, events.join("|"));
const second: any = iterator.next({ alpha: 1, beta: 2 });
console.log("second", second.done, second.value, events.join("|"));
const third: any = iterator.next("resume-alpha");
console.log("third", third.done, third.value, events.join("|"));
const fourth: any = iterator.next("resume-beta");
console.log("fourth", fourth.done, fourth.value, events.join("|"));
