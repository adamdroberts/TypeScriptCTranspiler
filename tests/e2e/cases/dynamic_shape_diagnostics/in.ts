const obj: any = {};
obj.a = 1;
obj.b = 2;
obj.a = 10;
delete obj.b;
Object.preventExtensions(obj);

const obj2: any = { x: 1 };
Object.seal(obj2);

const obj3: any = { y: 2 };
Object.freeze(obj3);

console.log("done");
