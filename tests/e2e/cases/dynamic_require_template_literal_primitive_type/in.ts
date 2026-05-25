type Id = 1n | 2n;
type Maybe = null | undefined;
type Target = `./primitive_${Id}_${Maybe}`;

function loadTarget(name: Target): any {
    return require(name);
}

let selected: Target = "./primitive_2_undefined";
const first = loadTarget(selected);
console.log("primitive template first:", first.label);

selected = "./primitive_1_null";
const second: any = require(selected);
console.log("primitive template second:", second.label);
