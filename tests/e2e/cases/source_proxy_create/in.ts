// @ts-nocheck
let source="17;";
try{new Proxy({},{});}catch(error){source=globalThis.unreachableSource;}
console.log(eval(source));
const events=[];
const target=new Proxy({}, {get(){throw "unexpected target read";}});
const handler=new Proxy({}, {get(){throw "unexpected handler read";}});
new Proxy(target,handler,(events.push("ignored"),0));
console.log(events.join("|"));
console.log("proxy-create-complete");
