type Suffix = "a" | "b";

const rawPrefix = String.raw`./raw_`;

function loadRaw(name: Suffix): any {
    return require(String.raw`./raw_${name}`);
}

let selected: Suffix = "b";
const first = loadRaw(selected);
console.log("raw first:", first.label);

selected = "a";
const second: any = require(String.raw`${rawPrefix}${selected}`);
console.log("raw second:", second.label);
