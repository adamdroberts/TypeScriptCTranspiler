console.log(eval('var method=function /* exact */(){return 43;};eval("("+method.toString()+")()");'));
console.log(eval('var method=Function("value","return value+1;");eval("("+method.toString()+")(46)");'));
