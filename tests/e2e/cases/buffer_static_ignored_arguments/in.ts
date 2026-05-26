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
const fromDefaultEncoding = Buffer.from("6869", undefined, mark("from-default-encoding"));
const defaultAllocated = Buffer.alloc(2, undefined, mark("alloc-default-fill"));
const defaultJoined = Buffer.concat([Buffer.from("A"), Buffer.from("B")], undefined, mark("concat-default-length"));
const defaultByteLength = Buffer.byteLength("é", undefined, mark("byte-length-default"));

console.log("from:", fromString.toString(), fromArray.toString(), fromBuffer.toString());
console.log("from default:", fromDefaultEncoding.toString("hex"));
console.log("alloc:", allocated.toString(), unsafe.length, slow.length);
console.log("alloc default:", defaultAllocated.toString("hex"));
console.log("concat:", joined.toString());
console.log("concat default:", defaultJoined.toString());
console.log("byteLength default:", defaultByteLength);
console.log("events:", events.join("|"));
