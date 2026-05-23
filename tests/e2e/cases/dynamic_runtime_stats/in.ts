const obj: any = { x: 1 };

obj.y = 2;
console.log("read:", obj.x);
console.log("has:", "y" in obj);
delete obj.y;
console.log("deleted:", "y" in obj);
