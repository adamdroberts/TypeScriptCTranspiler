const chooseShape: boolean = true;
const shapeName = chooseShape ? "./shape_a" : "./shape_b";
const shape: any = require(shapeName);

console.log("shape base:", shape.base);
console.log("shape label:", shape.label);
console.log("shape describe:", shape.describe());
