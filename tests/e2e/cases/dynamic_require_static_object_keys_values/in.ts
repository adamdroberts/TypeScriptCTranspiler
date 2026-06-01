const keyModules = {
    "./keys_a": true,
    "./keys_b": true,
} as const;

function loadFromKeys(index: 0 | 1): any {
    return require(Object.keys(keyModules)[index]);
}

const valueModules = {
    first: "./values_a",
    second: "./values_b",
} as const;

function loadFromValues(index: 0 | 1): any {
    return require(Object.values(valueModules)[index]);
}

console.log("object keys require:", loadFromKeys(1).label);
console.log("object values require:", loadFromValues(0).label);
