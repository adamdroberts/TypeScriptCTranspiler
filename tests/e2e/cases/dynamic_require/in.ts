const moduleName = "./other";
require(moduleName);

const concatModuleName = "./" + "other_concat";
require(concatModuleName);

const templateTarget = "other_template";
const templateModuleName = `./${templateTarget}`;
require(templateModuleName);
