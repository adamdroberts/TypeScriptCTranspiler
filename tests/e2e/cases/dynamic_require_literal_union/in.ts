function loadNamed(name: "./literal_a" | "./literal_b"): any {
    return require(name);
}

let selected: "./literal_a" | "./literal_b" = "./literal_b";
const first = loadNamed(selected);
console.log("literal union first:", first.label);

selected = "./literal_a";
const second: any = require(selected);
console.log("literal union second:", second.label);

function loadLocalSelected(): any {
    let localSelected: "./literal_local_a" | "./literal_local_b" = "./literal_local_b";
    return require(localSelected);
}

console.log("literal union local:", loadLocalSelected().label);
