let selected = "./dynamic_export";
const loaded: any = require(selected);

console.log("computed export:", loaded.label, loaded.count);
