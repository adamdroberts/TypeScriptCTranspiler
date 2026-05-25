type Id = 1 | 2;
type Flag = true | false;
type Target = `./number_${Id}_${Flag}`;

function loadTarget(name: Target): any {
    return require(name);
}

let selected: Target = "./number_2_false";
const first = loadTarget(selected);
console.log("numeric template first:", first.label);

selected = "./number_1_true";
const second: any = require(selected);
console.log("numeric template second:", second.label);
