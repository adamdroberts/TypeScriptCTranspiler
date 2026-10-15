console.log("unit:" + eval(String.fromCharCode(49, 55, 59)));
const build = String.fromCodePoint;
console.log("point:" + eval(build(49, 57, 59)));
let body = "23;";
try { String.fromCodePoint(1.5); } catch (error) { body = "29;"; }
console.log("range:" + eval(body));
console.log("metadata:" + String.fromCharCode.name + ":" + String.fromCodePoint.length);
console.log("complete");
