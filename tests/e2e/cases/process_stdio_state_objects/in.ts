import proc, { stderr, stdin, stdout } from "node:process";

const readable = stdin._readableState;
const writable = stdout._writableState;
const errWritable = stderr._writableState;

console.log(
    "readable:",
    readable.highWaterMark,
    readable.length,
    readable.objectMode,
    readable.ended,
    readable.flowing === null,
    readable.destroyed,
    readable.errored === null,
);
console.log(
    "writable:",
    writable.highWaterMark,
    writable.length,
    writable.objectMode,
    writable.ended,
    writable.finished,
    writable.destroyed,
    writable.errored === null,
);
console.log(
    "stderr:",
    errWritable.highWaterMark,
    errWritable.length,
    errWritable.ended,
    errWritable.finished,
);
console.log(
    "default:",
    proc.stdin._readableState.length,
    proc.stdout._writableState.highWaterMark,
);
