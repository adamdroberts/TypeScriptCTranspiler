const getSource = Function("return globalThis.source;");
(globalThis as any).source = "47;";
console.log(eval(getSource()));
console.log("global-binding-complete");
