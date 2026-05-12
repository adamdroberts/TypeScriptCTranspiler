const obj: any = JSON.parse("{\"a\":1,\"b\":\"two\"}");

for (const [key, value] of Object.entries(obj)) {
    console.log("entry", String(key), String(value), typeof value);
}

const pairs: any = [["x", 3], ["y", false]];
for (const [key, value] of pairs) {
    console.log("pair", String(key), String(value));
}
