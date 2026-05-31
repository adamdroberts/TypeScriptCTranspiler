const obj1: any = { x: 42 };
const obj2: any = { x: 100 };
const objects = [obj1, obj2];

for (let i = 0; i < 10; i++) {
    const o = objects[i % 2];
    console.log("val:", o.x);
}
