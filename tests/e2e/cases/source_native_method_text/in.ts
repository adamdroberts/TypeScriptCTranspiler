console.log(eval(JSON.stringify(Object.hasOwn.toString())));
console.log(eval(JSON.stringify(Reflect.apply.toString())));
console.log(eval(JSON.stringify(Array.prototype.values.toString())));
try { eval(Object.hasOwn.toString()); } catch (error) { console.log(error instanceof SyntaxError); }
console.log("native-method-text-complete");
