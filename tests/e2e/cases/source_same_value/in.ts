let body="17;";
const owner={toString(){body=String(Math.random());return "value";},callback(){body=String(Math.random());}};
Object.is(owner,owner);
console.log(eval(body));
console.log(Object.is(NaN,NaN),Object.is(0,-0));
console.log(Reflect.apply(Object.is,undefined,[owner,owner]));
console.log("same-value-complete");
