const events: string[] = [];

function mark(label: string): number {
    events.push(label);
    return 0;
}

const fromString = Buffer.from("Hi", "utf8", mark("from-string"));
const fromArray = Buffer.from([65, 66], mark("from-array"));
const fromBuffer = Buffer.from(fromString, mark("from-buffer"));
const allocated = Buffer.alloc(3, 67, mark("alloc"));
const unsafe = Buffer.allocUnsafe(2, mark("alloc-unsafe"));
const slow = Buffer.allocUnsafeSlow(2, mark("alloc-slow"));
const joined = Buffer.concat([fromString, fromArray], 4, mark("concat"));

console.log("from:", fromString.toString(), fromArray.toString(), fromBuffer.toString());
console.log("alloc:", allocated.toString(), unsafe.length, slow.length);
console.log("concat:", joined.toString());
console.log("events:", events.join("|"));
