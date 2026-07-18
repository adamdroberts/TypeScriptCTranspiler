const ownNameModules = {
    "./own_names_a": true,
    "./own_names_b": true,
} as const;

function loadFromOwnNames(index: 0 | 1): any {
    return require(Object.getOwnPropertyNames(ownNameModules)[index]);
}

const direct = require(Object.getOwnPropertyNames({ "./own_names_c": true })[0]);
const indexed = require(Object.getOwnPropertyNames({ ignored: true, "./own_names_d": true })[1]);

console.log("object own names require:", loadFromOwnNames(0).label, loadFromOwnNames(1).label);
console.log("object own names direct:", direct.label, indexed.label);
