const data: any = JSON.parse("{\"name\":\"Ada\",\"scores\":[1,true,\"x\"],\"meta\":{\"active\":true}}");

console.log("json:", JSON.stringify(data));
console.log("name:", data["name"]);

const scores: any = data["scores"];
console.log("len:", scores.length);
console.log("score0:", scores[0]);
console.log("score1:", scores[1]);
console.log("score2:", scores[2]);
console.log("active:", data["meta"]["active"]);
console.log("typeof name:", typeof data["name"]);
console.log("typeof score0:", typeof scores[0]);
console.log("typeof score1:", typeof scores[1]);
console.log("typeof missing:", typeof data["missing"]);
console.log("is string:", typeof data["name"] === "string");

const escaped: any = JSON.parse("{\"letter\":\"\\u0041\",\"accent\":\"\\u00e9\",\"face\":\"\\uD83D\\uDE00\"}");
const accent = String(escaped["accent"]);
const face = String(escaped["face"]);
console.log("unicode escapes:", escaped["letter"], accent.codePointAt(0), face.codePointAt(0));

const values = Object.values(data);
console.log("values len:", values.length);
values.forEach((v) => console.log(" value:", v));

const literal: any = { a: 1, b: "two", c: false };
console.log("literal:", JSON.stringify(literal));
