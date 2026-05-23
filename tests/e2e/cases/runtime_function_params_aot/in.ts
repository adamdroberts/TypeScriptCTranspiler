const makeNumber = Function("ignored", "return 42;");
console.log("function params aot:", makeNumber());

const makeString = new Function("left", "right", "return 'joined';");
console.log("new function params aot:", makeString());
