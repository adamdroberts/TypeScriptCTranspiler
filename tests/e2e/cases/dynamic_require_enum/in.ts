enum Target {
    A = "./enum_a",
    B = "./enum_b",
}

enum LocalTarget {
    A = "./enum_local_a",
    B = "./enum_local_b",
}

function loadTarget(name: Target): any {
    return require(name);
}

let selected: Target = Target.B;
const first = loadTarget(selected);
console.log("enum first:", first.label);

selected = Target.A;
const second: any = require(selected);
console.log("enum second:", second.label);

const direct: any = require(Target.A);
console.log("enum direct:", direct.label);

const bracket: any = require(Target["B"]);
console.log("enum bracket:", bracket.label);

function loadLocal(): any {
    let localSelected: LocalTarget = LocalTarget.B;
    return require(localSelected);
}

console.log("enum local:", loadLocal().label);
