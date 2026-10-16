const executeSource=eval;
let observed="";
const copy={...{get body(){observed+="get";return "17;";}}};
console.log(executeSource(copy.body));
console.log(observed);
const key=Symbol("body"),symbolCopy={...{[key]:"19;"}};
console.log(executeSource(symbolCopy[key]));
console.log("complete");
