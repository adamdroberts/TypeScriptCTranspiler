const fn = function explicit() {};
console.log(eval("'" + fn.name + "'"));
const bound = fn.bind(null).bind(null);
console.log(eval("'" + bound.name + "'"));
const method = { method() {} }.method;
console.log(eval("'" + method.name + "'"));
