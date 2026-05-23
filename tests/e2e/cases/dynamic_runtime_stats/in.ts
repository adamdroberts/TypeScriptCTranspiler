const obj: any = { x: 1 };

for (let i = 0; i < 2; i++) {
    console.log("read:", obj.x);
}
obj.y = 2;
console.log("has:", "y" in obj);
delete obj.y;
console.log("deleted:", "y" in obj);
