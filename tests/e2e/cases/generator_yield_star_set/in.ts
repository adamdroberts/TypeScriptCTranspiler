function* colors(input: Set<string>): Generator<string, string, undefined> {
    yield* input;
    return "done";
}

const source = new Set<string>();
source.add("red");
source.add("blue");
source.add("red");

let joined = "";
for (const color of colors(source)) {
    joined = joined + color + "|";
}
console.log("joined:", joined);

const iter = colors(source);
const first: any = iter.next();
const second: any = iter.next();
const third: any = iter.next();
console.log("manual:", first.value, second.value, third.done, third.value);
