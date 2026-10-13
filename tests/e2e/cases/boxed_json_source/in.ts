console.log("number:", eval(JSON.stringify(new Number(17))));
console.log("string:", eval(JSON.stringify(Object("19;"))));
const keys: any[] = [new String("y"), new Number(1), Object("x")];
console.log("keys:", JSON.stringify(eval("("+JSON.stringify({x:1,y:2},keys)+")")));
const wrapped: any = new Number(1);
wrapped.valueOf = function(): number { return 23; };
console.log("coerced:", eval(JSON.stringify(wrapped)));
const constructed: any = Reflect.construct(Number,[17],function Target(){});
console.log("target:", eval(JSON.stringify(constructed)));
