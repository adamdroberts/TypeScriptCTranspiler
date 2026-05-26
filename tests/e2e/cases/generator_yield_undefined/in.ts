function* values(): Generator<any, string, undefined> {
    yield;
    yield undefined;
    return "done";
}

const iter = values();
const first: any = iter.next();
const second: any = iter.next();
const third: any = iter.next();

console.log("first:", first.done, String(first.value));
console.log("second:", second.done, String(second.value));
console.log("third:", third.done, third.value);
