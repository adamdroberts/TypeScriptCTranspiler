const values: any = JSON.parse("[1,\"two\",true]");

for (const item of values) {
    console.log("value", String(item), typeof item);
}

const text: any = "hi";
let joined = "";
for (const ch of text) {
    joined += String(ch);
}
console.log("text", joined);
