declare function opaque():any;
console.log(eval('var run=function(body){arguments[0]=opaque();return eval(body);};run("17;");'));
