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

function loadLocalShape(name: "a" | "b"): any {
    const localPrefix = "./local_shape_";
    const localAKey = "a";
    const localBKey = "b";
    const localChoices = {
        [localAKey]: localPrefix + "a",
        [`${localBKey}`]: `${localPrefix}b`,
    };
    return require(localChoices[name]);
}

const localShape = loadLocalShape("a");

console.log("local shape base:", localShape.base);
console.log("local shape label:", localShape.label);
console.log("local shape describe:", localShape.describe());
