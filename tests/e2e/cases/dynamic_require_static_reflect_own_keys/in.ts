const reflectModules = {
    "./reflect_keys_a": true,
    "./reflect_keys_b": true,
} as const;

function loadFromReflectKeys(index: 0 | 1): any {
    return require(Reflect.ownKeys(reflectModules)[index]);
}

const direct = require(Reflect.ownKeys({ "./reflect_keys_c": true })[0]);
const indexed = require(Reflect.ownKeys({ ignored: true, "./reflect_keys_d": true })[1]);

console.log("reflect ownKeys require:", loadFromReflectKeys(0).label, loadFromReflectKeys(1).label);
console.log("reflect ownKeys direct:", direct.label, indexed.label);
