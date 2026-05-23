const obj: any = { x: 1 };
const key = "x";

for (let i = 0; i < 2; i++) {
    console.log("read:", obj.x);
}
for (let i = 0; i < 2; i++) {
    console.log("elem:", obj[key]);
}
const receiver: any = {};
for (let i = 0; i < 2; i++) {
    console.log("reflect:", Reflect.get(obj, key, receiver));
}
for (let i = 0; i < 2; i++) {
    obj.cached = i;
}
obj.y = 2;
console.log("has:", "y" in obj);
delete obj.y;
console.log("deleted:", "y" in obj);
console.log("cached:", obj.cached);
