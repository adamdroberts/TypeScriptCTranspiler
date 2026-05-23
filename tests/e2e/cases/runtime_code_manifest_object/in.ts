let source = "1 + 9";
console.log("manifest object eval number:", eval(source));

source = "'mapped-' + 'eval'";
console.log("manifest object eval string:", eval(source));

let body = "return 8 * 8;";
const makeNumber = Function(body);
console.log("manifest object function number:", makeNumber());

body = "return 'mapped-fn';";
const makeString = new Function(body);
console.log("manifest object function string:", makeString());
