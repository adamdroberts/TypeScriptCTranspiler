const moduleName = "./other";
require(moduleName);

const concatModuleName = "./" + "other_concat";
require(concatModuleName);

const templateTarget = "other_template";
const templateModuleName = `./${templateTarget}`;
require(templateModuleName);

const chooseBranch: boolean = true;
const branchModuleName = chooseBranch ? "./other_branch_a" : "./other_branch_b";
require(branchModuleName);

const chooseValue: boolean = false;
const valueModuleName = chooseValue ? "./other_value_a" : "./other_value_b";
const selectedModule: any = require(valueModuleName);
console.log("dynamic require value:", selectedModule.name);
