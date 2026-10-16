const execute=eval;
function read(body="17;"){console.log(execute(body));}
read();
const prototype:any=Array.prototype;
prototype.callback=read;
const target=function(){};
Object.setPrototypeOf(target,{});
Reflect.setPrototypeOf(target,{});
console.log("prototype-write-complete");
