const values: any = [1, "two", true];

const labels = Array.from(values, (value: any, index: number) => String(value) + ":" + String(index));
console.log("array:", labels.join("|"));

function describe(value: any, index: number): string {
    return String(index) + "=" + String(value);
}

const refs = Array.from(values, describe);
console.log("ref:", refs.join("|"));

const text: any = "ok";
const chars = Array.from(text, (value: any, index: number) => {
    return String(value) + String(index);
});
console.log("string:", chars.join("|"));
