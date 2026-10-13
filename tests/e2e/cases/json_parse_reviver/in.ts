const observed: string[] = [];
const parsed: any = JSON.parse('{"large":9007199254740993,"drop":1}', function(key: string, value: any, context: any): any {
    observed.push(key + ":" + String(context.source));
    if (key === "drop") return undefined;
    if (key === "large") return BigInt(context.source);
    return value;
});
console.log("large:", String(parsed.large));
console.log("keys:", Object.keys(parsed).join("|"));
console.log("trace:", observed.join("|"));
