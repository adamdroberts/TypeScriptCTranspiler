function parseBad(text: string): string {
    try {
        JSON.parse(text);
        return "ok";
    } catch (err) {
        return String(err);
    }
}

console.log("object:", parseBad("{]"));
console.log("unicode:", parseBad("\"\\uD800\""));
console.log("trailing:", parseBad("true false"));
console.log("after:", JSON.stringify(JSON.parse("{\"ok\":true}")));
