const makeFunction = Function;
const created: any = makeFunction("return 3");
console.log(created(), created.name);
