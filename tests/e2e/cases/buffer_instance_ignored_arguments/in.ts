const events: string[] = [];

function mark(label: string): number {
    events.push(label);
    return 0;
}

const text = Buffer.from("abcdef");
console.log("slice:", text.slice(1, 3, mark("slice")).toString(), text.subarray(2, 4, mark("subarray")).toString());

const filled = Buffer.alloc(4);
filled.fill(65, 1, 3, mark("fill"));
console.log("fill:", filled.toString("hex"));

const written = Buffer.alloc(4);
console.log("write:", written.write("zz", 1, 2, "utf8", mark("write")), written.toString("hex"));

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

const target = Buffer.alloc(3);
console.log("copy:", text.copy(target, 0, 1, 4, mark("copy")), target.toString());

console.log(
    "search:",
    text.indexOf("cd", 0, mark("index")),
    text.lastIndexOf("cd", 5, mark("last")),
    text.includes("ab", 0, mark("includes")),
);
console.log("compare:", text.compare(Buffer.from("abc"), mark("compare")));
console.log("own:", text.hasOwnProperty("0", mark("has")), text.propertyIsEnumerable("0", mark("enum")));
console.log("events:", events.join("|"));
