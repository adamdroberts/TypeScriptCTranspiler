const makeFunction: any = Function;
const fn = makeFunction("return 3");
console.log("first-class Function:", fn());
