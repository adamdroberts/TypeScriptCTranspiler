// @ts-nocheck
let body="17;";
const owner={get own(){throw "unexpected Get";},callback(){body=String(Math.random());}};
console.log(Object.hasOwn(owner,"own"));
Object.hasOwn(owner,String(Math.random()));
console.log(eval(body));
const key={toString(){body="19;";return "own";}};
try{Object.hasOwn(null,key);}catch(error){console.log(error.name);}
console.log(eval(body));
try{Object.prototype.hasOwnProperty.call(null,key);}catch(error){console.log(error.name);}
console.log(eval(body));
console.log(Reflect.apply(Object.hasOwn,undefined,["text","length"]));
console.log("own-query-complete");
