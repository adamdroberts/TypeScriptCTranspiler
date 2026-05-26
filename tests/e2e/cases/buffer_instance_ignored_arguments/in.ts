const events: string[] = [];

function mark(label: string): number {
    events.push(label);
    return 0;
}

const text = Buffer.from("abcdef");
console.log("slice:", text.slice(1, 3, mark("slice")).toString(), text.subarray(2, 4, mark("subarray")).toString());
console.log(
    "slice undef:",
    text.slice(undefined, 2, mark("slice-start-undefined")).toString(),
    text.slice(2, undefined, mark("slice-end-undefined")).toString(),
    text.subarray(undefined, undefined, mark("subarray-undefined")).toString(),
);
console.log("toString undef:", Buffer.from("hé").toString(undefined, mark("toString-undefined")));

const filled = Buffer.alloc(4);
filled.fill(65, 1, 3, mark("fill"));
console.log("fill:", filled.toString("hex"));
const defaultFilled = Buffer.alloc(3);
defaultFilled.fill(66, undefined, undefined, mark("fill-undefined"));
console.log("fill undef:", defaultFilled.toString());

const written = Buffer.alloc(4);
console.log("write:", written.write("zz", 1, 2, "utf8", mark("write")), written.toString("hex"));
const defaultWritten = Buffer.alloc(4);
console.log(
    "write undef:",
    defaultWritten.write("xy", undefined, undefined, undefined, mark("write-undefined")),
    defaultWritten.toString("hex"),
);

const numbers = Buffer.alloc(8);
console.log(
    "num write:",
    numbers.writeUInt8(255, 0, mark("write-u8")),
    numbers.writeInt16BE(-2, 1, mark("write-i16")),
    numbers.writeFloatLE(1.5, 4, mark("write-float")),
);
console.log(
    "num read:",
    numbers.readUInt8(0, mark("read-u8")),
    numbers.readInt16BE(1, mark("read-i16")),
    numbers.readFloatLE(4, mark("read-float")).toFixed(1),
);
const defaultNumbers = Buffer.alloc(4);
console.log(
    "num undef:",
    defaultNumbers.writeUInt8(7, undefined, mark("write-u8-undefined")),
    defaultNumbers.writeInt16BE(-3, undefined, mark("write-i16-undefined")),
    defaultNumbers.readUInt8(undefined, mark("read-u8-undefined")),
    defaultNumbers.readInt16BE(undefined, mark("read-i16-undefined")),
);

const target = Buffer.alloc(3);
console.log("copy:", text.copy(target, 0, 1, 4, mark("copy")), target.toString());
const defaultTarget = Buffer.alloc(4);
console.log(
    "copy undef:",
    text.copy(defaultTarget, undefined, 2, undefined, mark("copy-undefined")),
    defaultTarget.toString(),
);

console.log(
    "search:",
    text.indexOf("cd", 0, mark("index")),
    text.lastIndexOf("cd", 5, mark("last")),
    text.includes("ab", 0, mark("includes")),
);
console.log(
    "search undef:",
    text.indexOf("ab", undefined, mark("index-undefined")),
    text.lastIndexOf("ef", undefined, mark("last-undefined")),
    text.includes("cd", undefined, mark("includes-undefined")),
);
console.log("compare:", text.compare(Buffer.from("abc"), mark("compare")));
console.log("own:", text.hasOwnProperty("0", mark("has")), text.propertyIsEnumerable("0", mark("enum")));
console.log("events:", events.join("|"));
