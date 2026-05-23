let body = "return 17;";
const makeNumber = Function("ignored", body);
console.log("manifest function params:", makeNumber());

body = "return 'manifest-params';";
const makeString = new Function("left", "right", body);
console.log("manifest new function params:", makeString());
