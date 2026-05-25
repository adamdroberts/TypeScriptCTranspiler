type Param = `${"value"}`;
type Body = 'return "typed-param";';

const paramName: Param = "value";
const body: Body = 'return "typed-param";';

const make = Function(paramName, body);
console.log("function template param:", make("typed"));

const makeNew = new Function(paramName, body);
console.log("new function template param:", makeNew("new-typed"));
