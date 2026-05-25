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

const chooseNamed: boolean = true;
const namedModuleName = chooseNamed ? "./other_named_a" : "./other_named_b";
const selectedNamed: any = require(namedModuleName);
console.log("dynamic require named:", selectedNamed.label);

const callModuleName = "./other_call";
const callModule: any = require.call(module, callModuleName);
console.log("dynamic require call:", callModule.name);

const chooseApply: boolean = true;
const applyModuleName = chooseApply ? "./other_apply_a" : "./other_apply_b";
const applyModuleArgs = [applyModuleName];
const applyModule: any = module.require.apply(module, applyModuleArgs);
console.log("dynamic require apply:", applyModule.name);

const reflectModuleName = "./other_reflect";
const reflectModuleArgs = [reflectModuleName];
const reflectModule: any = Reflect.apply(module.require, module, reflectModuleArgs);
console.log("dynamic require reflect:", reflectModule.name);

const bareApplyModuleName = "./other_bare_apply";
const bareApplyModuleArgs = [bareApplyModuleName];
const bareApplyModule: any = require.apply(module, bareApplyModuleArgs);
console.log("dynamic require bare apply:", bareApplyModule.name);

const bareReflectModuleName = "./other_bare_reflect";
const bareReflectModuleArgs = [bareReflectModuleName];
const bareReflectModule: any = Reflect.apply(require, module, bareReflectModuleArgs);
console.log("dynamic require bare reflect:", bareReflectModule.name);

const boundModuleName = "./other_bound";
const boundRequire = require.bind(module);
const boundModule: any = boundRequire(boundModuleName);
console.log("dynamic require bound:", boundModule.name);

const inlineBoundModuleName = "./other_inline_bound";
const inlineBoundModule: any = module.require.bind(module)(inlineBoundModuleName);
console.log("dynamic require inline bound:", inlineBoundModule.name);

function loadLocal(): any {
    const localModuleName = "./other_local";
    return require(localModuleName);
}

console.log("dynamic require local:", loadLocal().label);
