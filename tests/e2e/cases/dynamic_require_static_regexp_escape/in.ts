const fromLeading = require("./" + RegExp.escape("foo").replace("\\x66oo", "leading"));
const fromSyntax = require("./" + RegExp.escape("a+b").replace("\\x61\\+b", "syntax"));

console.log(fromLeading.label, fromSyntax.label);
