console.log(eval('var run=function(body){arguments[0]="19;";return eval(body);};run("17;");'));
console.log(eval('var run=function(body){body="23;";return eval(arguments[0]);};run("17;");'));
console.log(eval('var run=function(body){"use strict";arguments[0]="29;";return eval(body);};run("17;");'));
console.log("arguments-source-complete");
