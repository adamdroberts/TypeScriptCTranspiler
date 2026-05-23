let selected = "./allow_map_a";
const first: any = require(selected);
console.log("mapped first:", first.label);

selected = "./allow_map_b";
const second: any = require(selected);
console.log("mapped second:", second.label);
