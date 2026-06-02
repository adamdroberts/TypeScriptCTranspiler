let source = "`manifest-${1 + 2}`";
console.log("manifest template:", eval(source));

source = "false ? missingEval() : 'selected-eval'";
console.log("manifest conditional:", eval(source));

source = "null ?? 'fallback-eval'";
console.log("manifest nullish:", eval(source));

source = "false && missingEval()";
console.log("manifest and:", eval(source));

source = "'truthy' || missingEval()";
console.log("manifest or:", eval(source));

let body = "return `fn-${2 * 3}`;";
const makeTemplate = Function(body);
console.log("manifest function template:", makeTemplate());

body = "return true ? 'selected-fn' : missingFunction();";
const makeConditional = new Function(body);
console.log("manifest function conditional:", makeConditional());
