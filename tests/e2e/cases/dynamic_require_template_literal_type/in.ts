type Prefix = "./template_";
type Suffix = "a" | "b";
type Target = `${Prefix}${Suffix}`;

function loadTarget(name: Target): any {
    return require(name);
}

let selected: Target = "./template_b";
const first = loadTarget(selected);
console.log("template first:", first.label);

selected = "./template_a";
const second: any = require(selected);
console.log("template second:", second.label);
