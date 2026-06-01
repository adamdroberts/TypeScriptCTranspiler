const keyModules = {
    "./entry_key_a": true,
    "./entry_key_b": true,
} as const;

function loadFromEntryKeys(index: 0 | 1): any {
    return require(Object.entries(keyModules)[index][0]);
}

const valueModules = {
    first: "./entry_value_a",
    second: "./entry_value_b",
} as const;

function loadFromEntryValues(index: 0 | 1): any {
    return require(Object.entries(valueModules)[index][1]);
}

console.log("object entries keys require:", loadFromEntryKeys(1).label);
console.log("object entries values require:", loadFromEntryValues(0).label);
