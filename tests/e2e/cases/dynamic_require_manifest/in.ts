let selected = "./allow_a";
const first: any = require(selected);
console.log("allowlisted first:", first.label);

selected = "./allow_b";
const second: any = require(selected);
console.log("allowlisted second:", second.label);
