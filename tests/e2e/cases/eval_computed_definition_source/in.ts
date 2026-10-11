let key: any = "method";
const object: any = {[key]() {}};
console.log(eval("'" + object[key].name + "'"));
class C { static get [key]() { return 1; } }
const getter: any = Object.getOwnPropertyDescriptor(C, key)!.get;
console.log(eval("'" + getter.name + "'"));
class Fields { [key]: any = () => 0; }
const field: any = new Fields()[key];
console.log(eval("'" + field.name + "'"));
