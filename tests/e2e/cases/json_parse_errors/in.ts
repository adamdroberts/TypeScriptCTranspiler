function parseBad(text: string): string {
    try {
        JSON.parse(text);
        return "ok";
    } catch (err) {
        return `${err instanceof SyntaxError}:${String(err)}`;
    }
}

console.log("object:", parseBad("{]"));
console.log("unicode:", parseBad("\"\\uD800\""));
const loneSurrogate = JSON.parse("\"\\uD800\"") as string;
console.log("unicode-code:", loneSurrogate.charCodeAt(0));
console.log("trailing:", parseBad("true false"));
console.log("whitespace:", parseBad("\vnull"));
console.log("number:", parseBad("01"), parseBad("1."), parseBad("1e"));
console.log("control:", parseBad("\"raw\ncontrol\""));
const protoValue: any = JSON.parse('{"__proto__":{"safe":true},"duplicate":1,"duplicate":2}');
console.log(
    "own-data:",
    Object.getPrototypeOf(protoValue) === Object.prototype,
    Object.hasOwn(protoValue, "__proto__"),
    protoValue.__proto__.safe,
    protoValue.duplicate,
);
console.log("after:", JSON.stringify(JSON.parse("{\"ok\":true}")));
