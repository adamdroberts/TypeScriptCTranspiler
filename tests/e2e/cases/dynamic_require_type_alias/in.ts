type Target = "./alias_a" | "./alias_b";
type LocalTarget = "./alias_local_a" | "./alias_local_b";

function loadTarget(name: Target): any {
    return require(name);
}

let selected: Target = "./alias_b";
const first = loadTarget(selected);
console.log("alias first:", first.label);

selected = "./alias_a";
const second: any = require(selected);
console.log("alias second:", second.label);

function loadLocal(): any {
    let localSelected: LocalTarget = "./alias_local_b";
    return require(localSelected);
}

console.log("alias local:", loadLocal().label);
