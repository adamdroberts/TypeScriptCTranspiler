const prefix = "./shape_";
const aKey = "a";
const bKey = "b";
const choices = {
    [aKey]: prefix + "a",
    [`${bKey}`]: `${prefix}b`,
};

function loadShape(name: "a" | "b"): any {
    return require(choices[name]);
}

const shape = loadShape("b");

console.log("shape base:", shape.base);
console.log("shape label:", shape.label);
console.log("shape describe:", shape.describe());
