function* expand(source: any): Generator<any, string, undefined> {
    yield* source;
    return "done";
}

const fromArray: any = ["a", 2, true];
const arrayValues: string[] = [];
for (const value of expand(fromArray)) {
    arrayValues.push(String(value));
}

const fromString: any = "hi";
const stringValues: string[] = [];
for (const value of expand(fromString)) {
    stringValues.push(String(value));
}

const manual = expand(["x"]);
const first: any = manual.next();
const done: any = manual.next();

console.log("array:", arrayValues.join("|"));
console.log("string:", stringValues.join("|"));
console.log("manual:", first.done, first.value, done.done, done.value);
