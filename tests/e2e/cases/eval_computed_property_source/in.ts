let key: any = "left";
key = "right";
const object: any = {left: "233;", right: "239;"};
console.log(eval(object[key]));
[key] = ["left"];
console.log(eval(object[key]));
const holder: any = {key: "right"};
[holder.key] = ["left"];
console.log(eval(object[holder.key]));
console.log(eval(Object.getOwnPropertyDescriptor(object, key)!.value));
class C {}
C.toString = function() { return "'left'"; };
const nestedKey: any = eval(C.toString());
console.log(eval(object[nestedKey]));
