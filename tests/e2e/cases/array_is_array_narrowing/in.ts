function describe(value: unknown): string {
    if (Array.isArray(value)) {
        value.push("tail");
        const copy = Array.from(value);
        return "array:" + copy.join("|") + ":" + value.length;
    }
    return "not-array:" + typeof value;
}

const parsed: unknown = JSON.parse("[1,\"two\"]");
const objectValue: unknown = JSON.parse("{\"x\":1}");
const numberValue: unknown = JSON.parse("5");

console.log(describe(parsed));
console.log(describe(objectValue));
console.log(describe(numberValue));
