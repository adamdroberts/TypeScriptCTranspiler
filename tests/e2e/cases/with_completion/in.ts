console.log(String(eval("31;with({}){}")));
console.log(String(eval("31;with({}){61;}")));
console.log(String(eval("31;outer:{37;with({}){break outer;}41;}")));
console.log(String(eval("31;do{37;with({}){continue;}41;}while(false);")));
