function label(value: string | number | boolean): string {
    if (typeof value === "boolean") {
        return value ? "bool:true" : "bool:false";
    }
    if (typeof value === "number") {
        return "num:" + (value + 0.5);
    }
    return "str:" + value.toUpperCase();
}

const text: string | number | boolean = JSON.parse("\"ada\"") as string | number | boolean;
const count: string | number | boolean = JSON.parse("4") as string | number | boolean;
const flag: string | number | boolean = JSON.parse("true") as string | number | boolean;

console.log(label(text));
console.log(label(count));
console.log(label(flag));
