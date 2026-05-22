let body = "return 6 * 7;";
const makeNumber = Function(body);
console.log("manifest function number:", makeNumber());

body = "return 'aot-fn';";
const makeString = new Function(body);
console.log("manifest function string:", makeString());
